import path from "node:path";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import { Daytona, type Sandbox } from "@daytona/sdk";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";

export const GAME_DIR = "/home/daytona/game";
export const PORT = 8000;
export const PREVIEW_PORT = PORT;

export function getRuntimeDirPath(): string | null {
  const candidates = [
    path.join(process.cwd(), "src/lib/games/runtime"),
    path.join(process.cwd(), "lib/games/runtime"),
    path.resolve(__dirname, "../games/runtime"),
    path.resolve(__dirname, "../../lib/games/runtime"),
    path.resolve(__dirname, "../../../src/lib/games/runtime"),
  ];

  for (const candidate of candidates) {
    if (fsSync.existsSync(/*turbopackIgnore: true*/ candidate)) {
      return candidate;
    }
  }
  return null;
}

interface RuntimeFileEntry {
  relativePath: string;
  fullPath: string;
  isDirectory: boolean;
}

async function collectRuntimeEntries(
  dir: string,
  baseDir: string = dir,
): Promise<RuntimeFileEntry[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results: RuntimeFileEntry[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      results.push({ relativePath, fullPath, isDirectory: true });
      const subEntries = await collectRuntimeEntries(fullPath, baseDir);
      results.push(...subEntries);
    } else if (entry.isFile()) {
      results.push({ relativePath, fullPath, isDirectory: false });
    }
  }

  return results;
}

/**
 * Recursively seeds all files, folders, and subfolders from runtime/* into the sandbox under GAME_DIR.
 */
export async function seedSandboxFromRuntime(sandbox: Sandbox): Promise<void> {
  const runtimeDir = getRuntimeDirPath();
  if (!runtimeDir) {
    console.warn(
      "[seedSandboxFromRuntime] Runtime directory not found, skipping runtime seed.",
    );
    return;
  }

  // 1. Ensure GAME_DIR exists in the sandbox
  await sandbox.fs.createFolder(GAME_DIR, "755").catch(() => {});

  const entries = await collectRuntimeEntries(runtimeDir);
  console.log(
    `[seedSandboxFromRuntime] Found ${entries.length} entries to seed from ${runtimeDir}`,
  );

  // 2. Create all directories first
  const directories = entries.filter((e) => e.isDirectory);
  for (const dir of directories) {
    const remoteDirPath = path.posix.join(GAME_DIR, dir.relativePath);
    await sandbox.fs.createFolder(remoteDirPath, "755").catch(() => {});
  }

  // 3. Upload all files
  const files = entries.filter((e) => !e.isDirectory);
  for (const file of files) {
    const remoteFilePath = path.posix.join(GAME_DIR, file.relativePath);
    const remoteParentDir = path.posix.dirname(remoteFilePath);

    if (remoteParentDir !== GAME_DIR) {
      await sandbox.fs.createFolder(remoteParentDir, "755").catch(() => {});
    }

    const contentBuffer = await fs.readFile(file.fullPath);

    try {
      await sandbox.fs.uploadFile(contentBuffer, remoteFilePath);
      console.log(`[seedSandboxFromRuntime] Seeded ${file.relativePath}`);
    } catch (uploadErr) {
      console.warn(
        `[seedSandboxFromRuntime] Direct upload failed for ${file.relativePath}, falling back to shell command:`,
        uploadErr,
      );
      const b64 = contentBuffer.toString("base64");
      await sandbox.process.executeCommand(
        `mkdir -p "${remoteParentDir}" && echo "${b64}" | base64 -d > "${remoteFilePath}"`,
      );
      console.log(
        `[seedSandboxFromRuntime] Seeded (via fallback) ${file.relativePath}`,
      );
    }
  }
}

/**
 * Retrieves a guaranteed, running Daytona sandbox instance for a game.
 * If the sandbox does not exist yet or failed to load, it creates a new one,
 * seeds /home/daytona/game/index.html, updates the database, and ensures
 * the sandbox is running and ready for tool execution.
 */
export async function getGameSandbox(
  gameId: string,
): Promise<{ sandbox: Sandbox }> {
  const apiKey = process.env.DAYTONA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing Daytona API Key. Please set DAYTONA_API_KEY in .env",
    );
  }

  const daytona = new Daytona({ apiKey });

  // 1. Look up existing sandboxId for this game in the database
  const [existingGame] = await db
    .select({ sandboxId: games.sandboxId })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);

  if (existingGame?.sandboxId) {
    try {
      const sandbox = await daytona.get(existingGame.sandboxId);
      // Ensure the sandbox is running
      if (sandbox.state === "stopped" || sandbox.state === "stopping") {
        console.log(
          `[getGameSandbox] Starting stopped sandbox ${existingGame.sandboxId}...`,
        );
        await sandbox.start();
      }
      return { sandbox };
    } catch (err) {
      console.warn(
        `[getGameSandbox] Sandbox ${existingGame.sandboxId} failed to load, creating replacement:`,
        err,
      );
    }
  }

  // 2. If no game record was found, check if gameId is actually a direct sandbox ID or name
  if (!existingGame) {
    try {
      const directSandbox = await daytona.get(gameId);
      if (
        directSandbox.state === "stopped" ||
        directSandbox.state === "stopping"
      ) {
        await directSandbox.start();
      }
      return { sandbox: directSandbox };
    } catch {
      // Proceed to create a new sandbox
    }
  }

  // 3. Create a new sandbox
  console.log(`[getGameSandbox] Creating new sandbox for game ${gameId}...`);
  const sandbox = await daytona.create();
  console.log(`[getGameSandbox] Sandbox created with ID: ${sandbox.id}`);

  // Seed /home/daytona/game from runtime/*
  try {
    await seedSandboxFromRuntime(sandbox);
  } catch (seedError) {
    console.error(
      `[getGameSandbox] Failed to seed sandbox from runtime:`,
      seedError,
    );
  }

  // 4. Save the sandbox ID on the game in Neon DB
  await db
    .update(games)
    .set({ sandboxId: sandbox.id })
    .where(eq(games.id, gameId));

  console.log(
    `[getGameSandbox] Saved sandboxId ${sandbox.id} to game ${gameId}`,
  );
  return { sandbox };
}

/**
 * Creates a Daytona sandbox for a game,
 * seeds /home/daytona/game/index.html with "New game",
 * and saves the sandboxId on the game in the database.
 */
export async function createGameSandbox(
  gameId: string,
): Promise<{ sandbox: Sandbox }> {
  return getGameSandbox(gameId);
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

  // First health-check for an existing instance before starting a new one
  try {
    const healthCheck = await sandbox.process.executeCommand(
      `curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT} || true`,
    );
    if (healthCheck.result?.trim() === "200") {
      console.log(
        `[startGameServer] Server already running and healthy on port ${PORT} (sandbox: ${sandboxId})`,
      );
      return { sandbox };
    }
  } catch (err) {
    console.warn(`[startGameServer] Initial health check failed:`, err);
  }

  // Not healthy / not running: ensure game directory and index.html exist, then start server
  console.log(
    `[startGameServer] Server not responding on port ${PORT}, starting python HTTP server...`,
  );
  try {
    const checkFile = await sandbox.process.executeCommand(
      'test -f /home/daytona/game/index.html && echo "exists" || true',
    );
    if (!checkFile.result?.includes("exists")) {
      await seedSandboxFromRuntime(sandbox);
    }
  } catch {
    await sandbox.process.executeCommand(
      'mkdir -p /home/daytona/game && test -f /home/daytona/game/index.html || printf "New game" > /home/daytona/game/index.html',
    );
  }

  // Serve index.html from /home/daytona/game
  await sandbox.process.executeCommand(
    `nohup python3 -m http.server ${PORT} --directory /home/daytona/game > /tmp/game-server.log 2>&1 &`,
  );

  // Poll for healthy status
  let isHealthy = false;
  for (let attempt = 0; attempt < 6; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const check = await sandbox.process.executeCommand(
        `curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT} || true`,
      );
      if (check.result?.trim() === "200") {
        isHealthy = true;
        console.log(
          `[startGameServer] Game server is now healthy on port ${PORT}`,
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
