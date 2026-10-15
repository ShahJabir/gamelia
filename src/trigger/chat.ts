import { task } from "@trigger.dev/sdk";
import { chat } from "@trigger.dev/sdk/ai";
import { streamText, stepCountIs } from "ai";
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

export const onChatStart = task({
  id: "on-chat-start",
  run: async (payload: { gameId: string }) => {
    console.log(
      `[onChatStart] Triggered sandbox creation for game ${payload.gameId}`,
    );
    const { sandbox } = await createGameSandbox(payload.gameId);
    console.log(
      `[onChatStart] Successfully created sandbox ${sandbox.id} for game ${payload.gameId}`,
    );
    return {
      gameId: payload.gameId,
      sandboxId: sandbox.id,
    };
  },
});

export const gameChatAgent = chat.agent({
  id: "game-chat-agent",
  tools: ({ chatId }) => createGameTools(chatId),
  run: async ({ messages, tools, signal }) => {
    const model = getLanguageModel();
    return streamText({
      ...chat.toStreamTextOptions({ tools }),
      model,
      instructions: systemPrompt,
      messages,
      abortSignal: signal,
      stopWhen: stepCountIs(15),
    });
  },
});

