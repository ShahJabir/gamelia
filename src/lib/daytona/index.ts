import { Daytona } from "@daytona/sdk";
import * as Sentry from "@sentry/nextjs";

export interface DaytonaConfigOptions {
  apiKey?: string;
  apiUrl?: string;
  target?: string;
}

/**
 * Returns a configured Daytona client instance.
 * Automatically uses DAYTONA_API_KEY from environment if apiKey is not explicitly provided.
 */
export function getDaytonaClient(options?: DaytonaConfigOptions) {
  const apiKey = options?.apiKey || process.env.DAYTONA_API_KEY;
  return new Daytona({
    apiKey,
    apiUrl: options?.apiUrl,
    target: options?.target,
  });
}

export interface RunCodeOptions {
  code: string;
  language?: "python" | "typescript" | "javascript";
  apiKey?: string;
  cleanup?: boolean;
}

/**
 * Creates an ephemeral Daytona sandbox, runs code inside it, and optionally cleans up the sandbox.
 */
export async function runCodeInSandbox({
  code,
  language = "python",
  apiKey,
  cleanup = true,
}: RunCodeOptions) {
  const daytona = getDaytonaClient({ apiKey });
  const sandbox = await daytona.create({
    language,
  });

  try {
    const response = await sandbox.process.codeRun(code);
    Sentry.logger.info("Daytona sandbox code execution finished", {
      sandbox_id: sandbox.id,
      language,
      exit_code: response.exitCode,
    });
    return {
      sandboxId: sandbox.id,
      result: response.result,
      exitCode: response.exitCode,
    };
  } finally {
    if (cleanup) {
      await sandbox.delete().catch((err) => {
        Sentry.logger.warn("Failed to delete Daytona sandbox during cleanup", {
          sandbox_id: sandbox.id,
          error_message: err instanceof Error ? err.message : String(err),
        });
      });
    }
  }
}

export { Daytona };
export * from "./utils";
