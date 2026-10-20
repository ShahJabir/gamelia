import { task } from "@trigger.dev/sdk";
import * as Sentry from "@sentry/nextjs";

export const exampleTask = task({
  id: "example-task",
  run: async (payload: { message?: string } = {}) => {
    const message = payload.message ?? "Hello from Trigger.dev!";
    Sentry.logger.info("Running example task in Trigger.dev", { message });

    return {
      success: true,
      message,
      timestamp: new Date().toISOString(),
    };
  },
});
