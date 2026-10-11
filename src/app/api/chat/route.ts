import { auth } from "@clerk/nextjs/server";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
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
      const record = m as unknown as Record<string, unknown>;
      const hasContent =
        typeof record.content === "string" &&
        record.content.trim().length > 0;
      return Boolean(hasParts || hasContent);
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

  // Ensure Daytona sandbox creation is triggered if not yet created
  try {
    const { getGame } = await import("@/lib/games/queries");
    const game = await getGame(id, effectiveOrgId);
    if (game && !game.sandboxId) {
      // 1. Queue via Trigger.dev task
      try {
        const { onChatStart } = await import("@/trigger/chat");
        await onChatStart.trigger({ gameId: id });
      } catch (triggerErr) {
        console.warn("[POST /api/chat] Trigger.dev trigger warning:", triggerErr);
      }

      // 2. Also run direct async creation so sandbox is created immediately
      import("@/lib/daytona/utils").then(({ createGameSandbox }) => {
        createGameSandbox(id).catch((err) => {
          console.error("[POST /api/chat] Direct sandbox creation failed:", err);
        });
      });
    }
  } catch (err) {
    console.warn("[POST /api/chat] Failed to check/trigger sandbox:", err);
  }

  try {
    const selectedModel = getLanguageModel(model);

    const result = streamText({
      model: selectedModel,
      instructions: systemPrompt,
      messages: await convertToModelMessages(validMessages),
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        originalMessages: validMessages,
        onEnd: async ({ messages: finalMessages }) => {
          try {
            const clean = sanitizeMessages(finalMessages);
            if (clean.length > 0) {
              await saveGameMessages(id, effectiveOrgId, clean);
              console.log(
                `[POST /api/chat] Successfully saved ${clean.length} messages to Neon DB for game ${id}`,
              );
            }
          } catch (dbErr) {
            console.error(
              `[POST /api/chat] Failed to save messages to Neon DB:`,
              dbErr,
            );
          }
        },
      }),
    });
  } catch (err: unknown) {
    console.error("Error in /api/chat streamText:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Failed to generate response";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
