import { task } from "@trigger.dev/sdk";
import { createGameSandbox } from "@/lib/daytona/utils";
import { systemPrompt, gameInstructions } from "@/lib/games/instructions";

export { systemPrompt, gameInstructions };

export const onChatStart = task({
  id: "on-chat-start",
  run: async (payload: { gameId: string }) => {
    console.log(`[onChatStart] Triggered sandbox creation for game ${payload.gameId}`);
    const sandboxId = await createGameSandbox(payload.gameId);
    console.log(
      `[onChatStart] Successfully created sandbox ${sandboxId} for game ${payload.gameId}`
    );
    return {
      gameId: payload.gameId,
      sandboxId,
    };
  },
});
