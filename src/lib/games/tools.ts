import path from "node:path";
import { tool } from "ai";
import { z } from "zod";
import { getGameSandbox, GAME_DIR } from "@/lib/daytona/utils";
import type { Sandbox } from "@daytona/sdk";

export { GAME_DIR };

/**
 * Resolves and strictly confines a relative path within /home/daytona/game.
 * Throws an error if any directory traversal outside GAME_DIR is attempted.
 */
export function resolveSafeGamePath(filePath: string): string {
  let relative = filePath.trim();

  // Strip leading sandbox game directory if provided
  if (relative.startsWith(GAME_DIR)) {
    relative = relative.slice(GAME_DIR.length);
  }

  // Strip leading slashes and relative dots
  relative = relative.replace(/^[/\\]+/, "").replace(/^\.[/\\]+/, "");

  const normalized = path.posix.normalize(relative);

  // Prevent directory traversal
  if (
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new Error(
      `Access denied: Path "${filePath}" traverses outside the game directory (${GAME_DIR}). All file operations must stay strictly inside ${GAME_DIR}.`,
    );
  }

  return path.posix.join(GAME_DIR, normalized);
}

/**
 * Writes a file into the sandbox. First attempts the native fs.uploadFile API.
 * If that fails (e.g. missing form-data module in worker, or transport glitch),
 * safely falls back to writing via base64 decoding through process execution.
 */
async function uploadOrWriteFile(
  sandbox: Sandbox,
  safePath: string,
  content: string,
): Promise<void> {
  const parentDir = path.posix.dirname(safePath);
  if (parentDir !== GAME_DIR) {
    await sandbox.fs.createFolder(parentDir, "755").catch(() => {});
  }

  try {
    await sandbox.fs.uploadFile(Buffer.from(content, "utf-8"), safePath);
    return;
  } catch (uploadErr) {
    console.warn(
      `[tools] sandbox.fs.uploadFile failed for ${safePath}, falling back to base64 shell write:`,
      uploadErr instanceof Error ? uploadErr.message : uploadErr,
    );
  }

  // Fallback: write file via base64 decoding in shell
  const b64 = Buffer.from(content, "utf-8").toString("base64");
  const fallbackCmd = `mkdir -p "${parentDir}" && echo "${b64}" | base64 -d > "${safePath}"`;
  const result = await sandbox.process.executeCommand(fallbackCmd);
  if (result.exitCode !== 0) {
    throw new Error(
      `Failed to write file to ${safePath}: ${result.result || "Unknown command error"}`,
    );
  }
}

/**
 * Reads a file from the sandbox. First attempts the native fs.downloadFile API.
 * If that fails (e.g. missing busboy module in worker, or transport glitch),
 * safely falls back to reading via base64 command execution.
 */
async function downloadOrReadFile(
  sandbox: Sandbox,
  safePath: string,
): Promise<string> {
  try {
    const fileBuf = await sandbox.fs.downloadFile(safePath);
    return Buffer.from(fileBuf).toString("utf-8");
  } catch (downloadErr) {
    console.warn(
      `[tools] sandbox.fs.downloadFile failed for ${safePath}, falling back to base64 shell read:`,
      downloadErr instanceof Error ? downloadErr.message : downloadErr,
    );
  }

  // Fallback: read file via base64 in shell
  const fallbackCmd = `base64 "${safePath}"`;
  const result = await sandbox.process.executeCommand(fallbackCmd);
  if (result.exitCode !== 0) {
    throw new Error(
      `Failed to read file from ${safePath}: ${result.result || "Unknown command error"}`,
    );
  }
  return Buffer.from(result.result.trim(), "base64").toString("utf-8");
}

/**
 * Creates the suite of Daytona game filesystem tools for a specific gameId or Sandbox.
 */
export function createGameTools(gameIdOrSandbox: string | Sandbox) {
  let cachedSandbox: Sandbox | null =
    typeof gameIdOrSandbox !== "string" ? gameIdOrSandbox : null;

  async function resolveSandbox(): Promise<Sandbox> {
    if (cachedSandbox) {
      return cachedSandbox;
    }
    if (typeof gameIdOrSandbox === "string") {
      const { sandbox } = await getGameSandbox(gameIdOrSandbox);
      cachedSandbox = sandbox;
      return sandbox;
    }
    cachedSandbox = gameIdOrSandbox;
    return gameIdOrSandbox;
  }

  const write_file = tool({
    description:
      "Create a new file or overwrite an existing file inside the game directory (/home/daytona/game). The primary game file is 'index.html'. Auxiliary files like 'game.js' or 'style.css' can also be created.",
    inputSchema: z.object({
      filePath: z
        .string()
        .describe(
          "Relative path inside the game directory (e.g. 'index.html', 'game.js', 'style.css')",
        ),
      content: z
        .string()
        .describe("The complete code or text content to write into the file"),
    }),
    execute: async ({ filePath, content }) => {
      try {
        const sandbox = await resolveSandbox();
        const safePath = resolveSafeGamePath(filePath);

        await uploadOrWriteFile(sandbox, safePath, content);

        return {
          success: true,
          filePath,
          fullPath: safePath,
          bytesWritten: Buffer.byteLength(content, "utf-8"),
          message: `Successfully wrote ${filePath}`,
        };
      } catch (err) {
        return {
          success: false,
          filePath,
          error:
            err instanceof Error
              ? err.message
              : "Failed to write file to game sandbox",
        };
      }
    },
  });

  const replace_text = tool({
    description:
      "Replace an exact substring or code snippet within an existing file in the game directory (/home/daytona/game). Useful for quick fixes, tuning parameters, or adding features without rewriting the whole file.",
    inputSchema: z.object({
      filePath: z
        .string()
        .describe(
          "Relative path to the target file inside the game directory (e.g. 'index.html')",
        ),
      oldText: z
        .string()
        .describe("The exact text or code snippet to find and replace"),
      newText: z
        .string()
        .describe("The replacement text or code snippet"),
    }),
    execute: async ({ filePath, oldText, newText }) => {
      try {
        const sandbox = await resolveSandbox();
        const safePath = resolveSafeGamePath(filePath);

        const currentContent = await downloadOrReadFile(sandbox, safePath);

        if (!currentContent.includes(oldText)) {
          return {
            success: false,
            filePath,
            error: `Target text was not found in ${filePath}. Ensure oldText matches the file content exactly.`,
          };
        }

        const updatedContent = currentContent.replace(oldText, newText);
        await uploadOrWriteFile(sandbox, safePath, updatedContent);

        return {
          success: true,
          filePath,
          message: `Successfully replaced text in ${filePath}`,
        };
      } catch (err) {
        return {
          success: false,
          filePath,
          error:
            err instanceof Error
              ? err.message
              : "Failed to replace text in game sandbox",
        };
      }
    },
  });

  const read_file = tool({
    description:
      "Read the full contents of a file inside the game directory (/home/daytona/game) to inspect existing code or assets.",
    inputSchema: z.object({
      filePath: z
        .string()
        .describe(
          "Relative path to the file inside the game directory (e.g. 'index.html')",
        ),
    }),
    execute: async ({ filePath }) => {
      try {
        const sandbox = await resolveSandbox();
        const safePath = resolveSafeGamePath(filePath);

        const content = await downloadOrReadFile(sandbox, safePath);

        return {
          success: true,
          filePath,
          content,
        };
      } catch (err) {
        return {
          success: false,
          filePath,
          error:
            err instanceof Error
              ? err.message
              : "Failed to read file from game sandbox",
        };
      }
    },
  });

  const list_files = tool({
    description:
      "List all files and directories inside the game directory (/home/daytona/game) or a subdirectory to see available project structure.",
    inputSchema: z.object({
      directoryPath: z
        .string()
        .optional()
        .describe(
          "Optional relative subdirectory inside the game directory to inspect. Defaults to root game directory.",
        ),
    }),
    execute: async ({ directoryPath = "" }) => {
      try {
        const sandbox = await resolveSandbox();
        const safeDir = resolveSafeGamePath(directoryPath);

        const entries = await sandbox.fs.listFiles(safeDir);
        const files = entries.map((e) => ({
          name: e.name,
          isDirectory: e.isDir,
          size: e.size,
        }));

        return {
          success: true,
          directory: directoryPath || ".",
          files,
        };
      } catch (err) {
        return {
          success: false,
          directory: directoryPath,
          error:
            err instanceof Error
              ? err.message
              : "Failed to list files in game sandbox",
        };
      }
    },
  });

  const delete_file = tool({
    description:
      "Delete a file inside the game directory (/home/daytona/game).",
    inputSchema: z.object({
      filePath: z
        .string()
        .describe(
          "Relative path to the file to delete inside the game directory",
        ),
    }),
    execute: async ({ filePath }) => {
      try {
        const sandbox = await resolveSandbox();
        const safePath = resolveSafeGamePath(filePath);

        if (safePath === GAME_DIR) {
          return {
            success: false,
            filePath,
            error: "Cannot delete the root game directory.",
          };
        }

        await sandbox.fs.deleteFile(safePath);

        return {
          success: true,
          filePath,
          message: `Successfully deleted ${filePath}`,
        };
      } catch (err) {
        return {
          success: false,
          filePath,
          error:
            err instanceof Error
              ? err.message
              : "Failed to delete file from game sandbox",
        };
      }
    },
  });

  return {
    write_file,
    replace_text,
    read_file,
    list_files,
    delete_file,
    ask_player,
  };
}

export const GAME_DIMENSIONS = [
  "loop",
  "goal",
  "challenge",
  "controls",
  "world",
  "look",
  "feel",
] as const;

export type GameDimension = (typeof GAME_DIMENSIONS)[number];

export const askPlayerInputSchema = z.object({
  dimension: z
    .enum(GAME_DIMENSIONS)
    .describe(
      "The part of the game being decided: loop (core repeated mechanic), goal (objective/win condition), challenge (obstacles/difficulty), controls (input scheme), world (setting/theme/layout), look (visual style/palette/camera), feel (pace/weight/juice/sound)",
    ),
  question: z
    .string()
    .describe(
      "The concise, engaging question putting a specific game design choice to the player",
    ),
  options: z
    .array(
      z.object({
        id: z.string().describe("Unique identifier for this option"),
        label: z.string().describe("Short, clear title for the choice"),
        description: z
          .string()
          .describe(
            "Concrete explanation of how this choice affects gameplay, mechanics, or aesthetics",
          ),
      }),
    )
    .min(2)
    .max(4)
    .describe("2 to 4 distinct options for the player to choose from"),
});

export const askPlayerOutputSchema = z.object({
  id: z.string().describe("The chosen option's id"),
  label: z.string().describe("The chosen option's label"),
});

/**
 * Human-in-the-loop tool allowing the AI to ask the player a structured question.
 * Has no execute function — answered by the player in the UI.
 */
export const ask_player = tool({
  description:
    "Ask the player a structured design question with 2 to 4 options to settle a game dimension (loop, goal, challenge, controls, world, look, feel). Halts execution for human-in-the-loop input from the player in the UI.",
  inputSchema: askPlayerInputSchema,
  outputSchema: askPlayerOutputSchema,
});

export const getGameTools = createGameTools;

/**
 * Standalone toolset that can accept gameId optionally in parameters or operate
 * when a target gameId is supplied.
 */
export const gameTools = createGameTools("");
export const {
  write_file,
  replace_text,
  read_file,
  list_files,
  delete_file,
} = gameTools;
