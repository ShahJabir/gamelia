import { Daytona } from "@daytona/sdk";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";

/**
 * Creates a Daytona sandbox for a game,
 * seeds /home/daytona/game/index.html with "New game",
 * and saves the sandboxId on the game in the database.
 */
export async function createGameSandbox(gameId: string): Promise<string> {
  const apiKey = process.env.DAYTONA_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Daytona API Key. Please set DAYTONA_API_KEY in .env");
  }

  const daytona = new Daytona({ apiKey });

  console.log(`[createGameSandbox] Creating sandbox for game ${gameId}...`);
  const sandbox = await daytona.create();
  console.log(`[createGameSandbox] Sandbox created with ID: ${sandbox.id}`);

  // Seed /home/daytona/game/index.html with "New game"
  try {
    await sandbox.fs.createFolder("/home/daytona/game", "755").catch(() => {});
    await sandbox.fs.uploadFile(
      Buffer.from("New game"),
      "/home/daytona/game/index.html"
    );
    console.log(`[createGameSandbox] Seeded /home/daytona/game/index.html with "New game"`);
  } catch (fsError) {
    console.warn(
      `[createGameSandbox] Direct upload failed, falling back to shell command:`,
      fsError
    );
    try {
      await sandbox.process.executeCommand(
        'mkdir -p /home/daytona/game && printf "New game" > /home/daytona/game/index.html'
      );
      console.log(`[createGameSandbox] Seeded index.html via shell fallback`);
    } catch (cmdError) {
      console.error(`[createGameSandbox] Failed to seed index.html:`, cmdError);
    }
  }

  // Save the sandbox ID on the game in Neon DB
  await db
    .update(games)
    .set({ sandboxId: sandbox.id })
    .where(eq(games.id, gameId));

  console.log(`[createGameSandbox] Saved sandboxId ${sandbox.id} to game ${gameId}`);
  return sandbox.id;
}
