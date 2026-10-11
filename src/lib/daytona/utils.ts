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
    throw new Error(
      "Missing Daytona API Key. Please set DAYTONA_API_KEY in .env",
    );
  }

  // Check if game already has a sandbox
  const [existingGame] = await db
    .select({ sandboxId: games.sandboxId })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);

  if (existingGame?.sandboxId) {
    console.log(
      `[createGameSandbox] Game ${gameId} already has sandbox ${existingGame.sandboxId}`,
    );
    return existingGame.sandboxId;
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
      "/home/daytona/game/index.html",
    );
    console.log(
      `[createGameSandbox] Seeded /home/daytona/game/index.html with "New game"`,
    );
  } catch (fsError) {
    console.warn(
      `[createGameSandbox] Direct upload failed, falling back to shell command:`,
      fsError,
    );
    try {
      await sandbox.process.executeCommand(
        'mkdir -p /home/daytona/game && printf "New game" > /home/daytona/game/index.html',
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

  console.log(
    `[createGameSandbox] Saved sandboxId ${sandbox.id} to game ${gameId}`,
  );
  return sandbox.id;
}

/**
 * Starts the game HTTP server in the Daytona sandbox if not already running.
 * Serves /home/daytona/game/index.html on port 8000.
 * First health-checks for an existing running instance before starting a new one.
 */
export async function startGameServer(sandboxId: string) {
  const apiKey = process.env.DAYTONA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing Daytona API Key. Please set DAYTONA_API_KEY in .env",
    );
  }

  const daytona = new Daytona({ apiKey });
  const sandbox = await daytona.get(sandboxId);

  // If sandbox is stopped, start it first
  if (sandbox.state === "stopped" || sandbox.state === "stopping") {
    console.log(`[startGameServer] Starting sandbox ${sandboxId}...`);
    await sandbox.start();
  }

  const port = 8000;

  // First health-check for an existing instance before starting a new one
  try {
    const healthCheck = await sandbox.process.executeCommand(
      `curl -s -o /dev/null -w "%{http_code}" http://localhost:${port} || true`,
    );
    if (healthCheck.result?.trim() === "200") {
      console.log(
        `[startGameServer] Server already running and healthy on port ${port} (sandbox: ${sandboxId})`,
      );
      return { sandbox };
    }
  } catch (err) {
    console.warn(`[startGameServer] Initial health check failed:`, err);
  }

  // Not healthy / not running: ensure game directory and index.html exist, then start server
  console.log(
    `[startGameServer] Server not responding on port ${port}, starting python HTTP server...`,
  );
  await sandbox.process.executeCommand(
    'mkdir -p /home/daytona/game && test -f /home/daytona/game/index.html || printf "New game" > /home/daytona/game/index.html',
  );

  // Serve index.html from /home/daytona/game
  await sandbox.process.executeCommand(
    `nohup python3 -m http.server ${port} --directory /home/daytona/game > /tmp/game-server.log 2>&1 &`,
  );

  // Poll for healthy status
  let isHealthy = false;
  for (let attempt = 0; attempt < 6; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const check = await sandbox.process.executeCommand(
        `curl -s -o /dev/null -w "%{http_code}" http://localhost:${port} || true`,
      );
      if (check.result?.trim() === "200") {
        isHealthy = true;
        console.log(
          `[startGameServer] Game server is now healthy on port ${port}`,
        );
        break;
      }
    } catch {}
  }

  if (!isHealthy) {
    console.warn(
      `[startGameServer] Game server health check did not respond with 200 within timeout`,
    );
  }

  return { sandbox };
}

const previewLinkCache = new Map<
  string,
  { url: string; token: string; expiresAt: number }
>();

/**
 * Gets the preview link info for a sandbox port with in-memory caching.
 */
export async function getGamePreviewLink(
  sandboxId: string,
  port = 8000,
  forceRefresh = false,
) {
  const cacheKey = `${sandboxId}:${port}`;
  if (!forceRefresh) {
    const cached = previewLinkCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached;
    }
  }

  const apiKey = process.env.DAYTONA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing Daytona API Key. Please set DAYTONA_API_KEY in .env",
    );
  }

  const daytona = new Daytona({ apiKey });
  const sandbox = await daytona.get(sandboxId);
  const preview = await sandbox.getPreviewLink(port);

  // Cache for 10 minutes
  previewLinkCache.set(cacheKey, {
    url: preview.url,
    token: preview.token,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  return preview;
}


