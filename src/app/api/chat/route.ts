import { auth } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  stepCountIs,
  toUIMessageStream,
  UIMessage,
} from "ai";
import {
  deleteGame,
  getGameMessages,
  saveGameMessages,
} from "@/lib/games/queries";
import { getLanguageModel } from "@/lib/ai/provider";
import { systemPrompt } from "@/lib/games/instructions";
import { createGameTools } from "@/lib/games/tools";
import { calculateStepCost } from "@/lib/credits/pricing";
import { chargeStep } from "@/lib/credits/ledger";
import { checkOrgCredits, OUT_OF_CREDITS_MESSAGE } from "@/lib/credits/check";

export const maxDuration = 30;

function sanitizeMessages(msgs: UIMessage[]): UIMessage[] {
  return (msgs ?? []).filter((m) => {
    if (m.role === "assistant") {
      const hasParts =
        Array.isArray(m.parts) &&
        m.parts.some(
          (p: unknown) =>
            typeof p === "object" &&
            p !== null &&
            "type" in p &&
            (p as { type: unknown }).type === "text" &&
            "text" in p &&
            typeof (p as { text: unknown }).text === "string" &&
            ((p as { text: string }).text).trim().length > 0,
        );
      const hasTools =
        Array.isArray(m.parts) &&
        m.parts.some((p: unknown) => {
          const part = p as Record<string, unknown> | null;
          return (
            part &&
            ((typeof part.type === "string" &&
              (part.type.startsWith("tool-") ||
                part.type === "dynamic-tool" ||
                part.type === "tool-invocation")) ||
              Boolean(part.toolInvocation))
          );
        });
      const record = m as unknown as Record<string, unknown>;
      const hasContent =
        typeof record.content === "string" &&
        record.content.trim().length > 0;
      const legacyTools =
        Array.isArray(record.toolInvocations) &&
        record.toolInvocations.length > 0;
      return Boolean(hasParts || hasContent || hasTools || legacyTools);
    }
    return true;
  });
}

export async function GET(req: Request) {
  const { orgId, userId } = await auth();
  const effectiveOrgId = orgId || userId;

  if (!effectiveOrgId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Game ID is required", { status: 400 });
  }

  const messages = await getGameMessages(id);

  if (messages === null) {
    return new Response("Game not found", { status: 404 });
  }

  return Response.json({ messages: sanitizeMessages(messages as UIMessage[]) });
}

export async function DELETE(req: Request) {
  const { orgId, userId } = await auth();
  const effectiveOrgId = orgId || userId;

  if (!effectiveOrgId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Game ID is required", { status: 400 });
  }

  const success = await deleteGame(id, effectiveOrgId);

  if (!success) {
    return new Response("Game not found", { status: 404 });
  }

  return Response.json({ success: true });
}

export async function POST(req: Request) {
  const { orgId, userId } = await auth();
  const effectiveOrgId = orgId || userId;

  if (!effectiveOrgId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const {
    messages,
    id,
    model,
  }: { messages: UIMessage[]; id: string; model?: string } = await req.json();

  if (!id) {
    return new Response("Game ID is required", { status: 400 });
  }

  const validMessages = sanitizeMessages(messages);

  // Persist the clean incoming messages to Neon DB
  if (validMessages.length > 0) {
    await saveGameMessages(id, effectiveOrgId, validMessages);
  }

  // Check before a session starts, and before every turn after that.
  // If the balance is empty, checkOrgCredits syncs the subscription once first.
  const { hasCredits } = await checkOrgCredits(effectiveOrgId);
  if (!hasCredits) {
    Sentry.logger.warn("Blocking build in /api/chat: org out of credits", {
      game_id: id,
      org_id: effectiveOrgId,
    });

    const textId = crypto.randomUUID();
    return createUIMessageStreamResponse({
      stream: createUIMessageStream({
        originalMessages: validMessages,
        execute: ({ writer }) => {
          writer.write({ type: "text-start", id: textId });
          writer.write({
            type: "text-delta",
            id: textId,
            delta: OUT_OF_CREDITS_MESSAGE,
          });
          writer.write({ type: "text-end", id: textId });
        },
        onEnd: async ({ messages: finalMessages }) => {
          try {
            const clean = sanitizeMessages(finalMessages);
            if (clean.length > 0) {
              await saveGameMessages(id, effectiveOrgId, clean);
              Sentry.logger.info("Saved out of credits message to Neon DB", {
                game_id: id,
                org_id: effectiveOrgId,
                message_count: clean.length,
              });
            }
          } catch (dbErr) {
            Sentry.logger.error(
              "Failed to save out of credits message to Neon DB",
              {
                game_id: id,
                org_id: effectiveOrgId,
                error_message:
                  dbErr instanceof Error ? dbErr.message : String(dbErr),
              },
            );
            Sentry.captureException(dbErr, {
              tags: {
                game_id: id,
                route: "/api/chat",
                reason: "out_of_credits_save",
              },
            });
          }
        },
      }),
    });
  }

  try {
    const selectedModel = getLanguageModel(model);

    const gameTools = createGameTools(id);

    const result = streamText({
      model: selectedModel,
      instructions: systemPrompt,
      messages: await convertToModelMessages(validMessages),
      tools: gameTools,
      stopWhen: stepCountIs(15),
      onStepFinish: async (step) => {
        try {
          if (effectiveOrgId && step.response?.id) {
            const cost = calculateStepCost(step.usage, model);
            await chargeStep(effectiveOrgId, step.response.id, cost);
            Sentry.logger.info("Charged step in /api/chat", {
              org_id: effectiveOrgId,
              game_id: id,
              response_id: step.response.id,
              cost: cost.toString(),
              step_number: step.stepNumber,
            });
          }
        } catch (stepErr) {
          Sentry.logger.error("Failed to charge step in /api/chat", {
            game_id: id,
            error: stepErr instanceof Error ? stepErr.message : String(stepErr),
          });
        }
      },
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        originalMessages: validMessages,
        onEnd: async ({ messages: finalMessages }) => {
          let cleanCount = 0;
          try {
            const clean = sanitizeMessages(finalMessages);
            cleanCount = clean.length;
            if (clean.length > 0) {
              await saveGameMessages(id, effectiveOrgId, clean);
              Sentry.logger.info("Saved chat messages to Neon DB", {
                game_id: id,
                org_id: effectiveOrgId,
                message_count: clean.length,
              });
            }
          } catch (dbErr) {
            Sentry.logger.error("Failed to save chat messages to Neon DB", {
              game_id: id,
              org_id: effectiveOrgId,
              error_message:
                dbErr instanceof Error ? dbErr.message : String(dbErr),
            });
            Sentry.captureException(dbErr, {
              tags: { game_id: id, route: "/api/chat" },
              extra: { message_count: cleanCount },
            });
          }
        },
      }),
    });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to generate response";
    Sentry.logger.error("Error in /api/chat streamText", {
      game_id: id,
      model,
      error_message: errorMessage,
    });
    Sentry.captureException(err, {
      tags: { game_id: id, route: "/api/chat", model },
    });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
