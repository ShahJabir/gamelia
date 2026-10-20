import { Daytona } from "@daytona/sdk";
import * as Sentry from "@sentry/nextjs";

async function main() {
  const apiKey = process.env.DAYTONA_API_KEY;
  if (!apiKey) {
    Sentry.logger.error("Missing DAYTONA_API_KEY environment variable");
    process.exit(1);
  }

  Sentry.logger.info("Initializing Daytona client");
  const daytona = new Daytona({ apiKey });

  Sentry.logger.info("Creating Daytona sandbox");
  const sandbox = await daytona.create();
  Sentry.logger.info("Sandbox created", { sandbox_id: sandbox.id });

  try {
    Sentry.logger.info("Running code inside sandbox", { sandbox_id: sandbox.id });
    const response = await sandbox.process.codeRun('print("Hello World")');
    Sentry.logger.info("Sandbox output received", {
      sandbox_id: sandbox.id,
      result: response.result,
    });
  } finally {
    Sentry.logger.info("Cleaning up sandbox", { sandbox_id: sandbox.id });
    await sandbox.delete();
    Sentry.logger.info("Sandbox deleted", { sandbox_id: sandbox.id });
  }
}

main().catch((err) => {
  Sentry.logger.error("Daytona sandbox error", {
    error_message: err instanceof Error ? err.message : String(err),
  });
  Sentry.captureException(err);
  process.exit(1);
});

export { main };
