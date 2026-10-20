"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { generateText, type UIMessage } from "ai";
import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { getLanguageModel } from "@/lib/ai/provider";

function getFallbackTitle(prompt: string): string {
  const cleaned = prompt.replace(/[^\w\s-]/g, "").trim();
  const words = cleaned.split(/\s+/).slice(0, 4).join(" ");
  return words.length > 35 ? words.slice(0, 32) + "..." : words || "New Game";
}

export async function createGame(formData: FormData) {
  const { orgId, userId } = await auth();
  const effectiveOrgId = orgId || userId;

  if (!effectiveOrgId) {
    throw new Error("Authentication is required to create a game");
  }

  const prompt = (
    formData.get("prompt") ||
    formData.get("title") ||
    ""
  ) as string;

  if (!prompt?.trim()) {
    throw new Error("Prompt is required");
  }

  const userPrompt = prompt.trim();
  let title = getFallbackTitle(userPrompt);

  // Generate a short, creative game title using AI SDK generateText with Google: Gemma 4 31B (free) via OpenRouter
  try {
    const model = getLanguageModel("google/gemma-4-31b-it:free");
    const { text } = await generateText({
      model,
      system:
        "You are a video game naming assistant. Generate a short, catchy, creative game title (2 to 4 words, no quotes, no markdown, no punctuation) based on the user's game concept prompt. Output ONLY the title.",
      prompt: userPrompt,
      maxOutputTokens: 15,
      abortSignal: AbortSignal.timeout(6000),
    });

    const cleanTitle = text
      .trim()
      .replace(/[*_"`#]/g, "")
      .replace(/^(Title|Game Title):\s*/i, "")
      .trim();

    if (cleanTitle) {
      title = cleanTitle;
      Sentry.logger.info("AI generated title for game", {
        generated_title: cleanTitle,
        prompt_preview: userPrompt.slice(0, 30),
      });
    }
  } catch (error) {
    Sentry.logger.warn("AI title generation error, using fallback title", {
      error_message: error instanceof Error ? error.message : String(error),
      fallback_title: title,
    });
  }

  const initialUserMessage: UIMessage = {
    id: crypto.randomUUID(),
    role: "user",
    parts: [{ type: "text", text: userPrompt }],
  };

  const [game] = await db
    .insert(games)
    .values({
      orgId: effectiveOrgId,
      title,
      messages: [initialUserMessage],
    })
    .returning();

  Sentry.logger.info("Game created in database", {
    game_id: game.id,
    title: game.title,
    org_id: effectiveOrgId,
  });

  // Provision single Daytona sandbox in background via Trigger.dev (with direct fallback)
  try {
    const { onChatStart } = await import("@/trigger/chat");
    await onChatStart.trigger({ gameId: game.id, orgId: effectiveOrgId });
    Sentry.logger.info("Triggered background sandbox creation task", {
      game_id: game.id,
      org_id: effectiveOrgId,
    });
  } catch (err) {
    Sentry.logger.warn(
      "Trigger.dev task trigger unavailable, using direct creation fallback",
      {
        game_id: game.id,
        error_message: err instanceof Error ? err.message : String(err),
      },
    );
    const { checkOrgCredits } = await import("@/lib/credits/check");
    const { hasCredits } = await checkOrgCredits(effectiveOrgId);
    if (hasCredits) {
      const { createGameSandbox } = await import("@/lib/daytona/utils");
      createGameSandbox(game.id).catch((directErr) => {
        Sentry.logger.error("Direct sandbox creation fallback failed", {
          game_id: game.id,
          error_message:
            directErr instanceof Error ? directErr.message : String(directErr),
        });
        Sentry.captureException(directErr, {
          tags: { game_id: game.id, action: "createGame-fallback" },
        });
      });
    } else {
      Sentry.logger.warn("Direct sandbox creation fallback blocked: out of credits", {
        game_id: game.id,
        org_id: effectiveOrgId,
      });
    }
  }

  revalidatePath("/", "layout");
  redirect(`/game/${game.id}`);
}

export async function deleteGameAction(gameId: string) {
  const { orgId, userId } = await auth();
  const effectiveOrgId = orgId || userId;

  if (!effectiveOrgId) {
    throw new Error("Authentication is required to delete a game");
  }

  const { deleteGame } = await import("@/lib/games/queries");
  const success = await deleteGame(gameId, effectiveOrgId);

  Sentry.logger.info("Game deletion requested via server action", {
    game_id: gameId,
    org_id: effectiveOrgId,
    success,
  });

  if (success) {
    revalidatePath("/", "layout");
  }

  return success;
}

