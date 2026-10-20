import { task } from "@trigger.dev/sdk";
import { chat } from "@trigger.dev/sdk/ai";
import { streamText, stepCountIs } from "ai";
import * as Sentry from "@sentry/nextjs";
import { createGameSandbox, getGameSandbox } from "@/lib/daytona/utils";
import { systemPrompt, gameInstructions } from "@/lib/games/instructions";
import { getLanguageModel } from "@/lib/ai/provider";
import {
  createGameTools,
  gameTools,
  write_file,
  replace_text,
  read_file,
  list_files,
  delete_file,
  ask_player,
} from "@/lib/games/tools";

export {
  systemPrompt,
  gameInstructions,
  getGameSandbox,
  createGameTools,
  gameTools,
  write_file,
  replace_text,
  read_file,
  list_files,
  delete_file,
  ask_player,
};

import { getGameOrgId } from "@/lib/games/queries";
import { calculateStepCost } from "@/lib/credits/pricing";
import { chargeStep } from "@/lib/credits/ledger";
import { checkOrgCredits, OUT_OF_CREDITS_MESSAGE } from "@/lib/credits/check";
import { z } from "zod";

export const onChatStart = task({
  id: "on-chat-start",
  run: async (payload: { gameId: string; orgId?: string }) => {
    // Worker has no auth(), so use passed orgId or query Neon DB by gameId
    const targetOrgId = payload.orgId || (await getGameOrgId(payload.gameId));

    if (targetOrgId) {
      // Check before session starts: if balance is empty, sync subscription once first
      const { hasCredits } = await checkOrgCredits(targetOrgId);
      if (!hasCredits) {
        Sentry.logger.warn(
          "Trigger.dev onChatStart blocked sandbox creation: org out of credits",
          {
            game_id: payload.gameId,
            org_id: targetOrgId,
          },
        );
        return {
          gameId: payload.gameId,
          blocked: true,
          reason: "out_of_credits",
        };
      }
    }

    Sentry.logger.info("Trigger.dev onChatStart task: creating sandbox", {
      game_id: payload.gameId,
      org_id: targetOrgId,
    });
    const { sandbox } = await createGameSandbox(payload.gameId);
    Sentry.logger.info("Trigger.dev onChatStart task: created sandbox", {
      game_id: payload.gameId,
      sandbox_id: sandbox.id,
    });
    return {
      gameId: payload.gameId,
      sandboxId: sandbox.id,
    };
  },
});

export const gameChatAgent = chat.agent({
  id: "game-chat-agent",
  clientDataSchema: z.object({
    orgId: z.string().optional(),
  }),
  tools: ({ chatId }) => createGameTools(chatId),
  run: async ({ messages, tools, signal, streamText: runStreamText, chatId, clientData }) => {
    const modelId = "gemini-3.6-flash";
    const model = getLanguageModel(modelId);
    // Worker has no auth(), so use clientData.orgId or query Neon DB
    let orgId: string | null = clientData?.orgId || null;
    if (!orgId && chatId) {
      orgId = await getGameOrgId(chatId);
    }

    // Check before session starts, and before every turn after that
    if (orgId) {
      const { hasCredits } = await checkOrgCredits(orgId);
      if (!hasCredits) {
        Sentry.logger.warn("gameChatAgent blocked build: org out of credits", {
          chat_id: chatId,
          org_id: orgId,
        });

        // Player sees a message in the chat, not a crash
        const textId = crypto.randomUUID();
        chat.response.write({ type: "text-start", id: textId });
        chat.response.write({
          type: "text-delta",
          id: textId,
          delta: OUT_OF_CREDITS_MESSAGE,
        });
        chat.response.write({ type: "text-end", id: textId });
        return;
      }
    }

    const stream = runStreamText ?? streamText;

    return stream({
      ...chat.toStreamTextOptions({ tools }),
      model,
      instructions: systemPrompt,
      messages,
      abortSignal: signal,
      stopWhen: stepCountIs(15),
      onStepFinish: async (step) => {
        try {
          if (!step.response?.id) return;
          const targetOrgId = orgId || (chatId ? await getGameOrgId(chatId) : null);
          if (!targetOrgId) return;

          const cost = calculateStepCost(step.usage, modelId);
          await chargeStep(targetOrgId, step.response.id, cost);

          Sentry.logger.info("Charged step in Trigger.dev gameChatAgent", {
            org_id: targetOrgId,
            game_id: chatId,
            response_id: step.response.id,
            cost: cost.toString(),
            step_number: step.stepNumber,
          });
        } catch (err) {
          Sentry.logger.error("Failed to charge step in gameChatAgent", {
            chat_id: chatId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      },
    });
  },
});

