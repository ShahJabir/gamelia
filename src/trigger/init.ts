import { tasks } from "@trigger.dev/sdk";
import * as Sentry from "@sentry/node";

// Initialize Sentry for Trigger.dev background workers
Sentry.init({
  defaultIntegrations: false,
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
    process.env.SENTRY_ENVIRONMENT ||
    (process.env.NODE_ENV === "production" ? "production" : "development"),
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
});

// Register global onFailure hook to capture task errors in Sentry
tasks.onFailure(async ({ payload, error, ctx }) => {
  Sentry.captureException(error, {
    extra: {
      payload,
      ctx,
    },
    tags: {
      task: ctx.task.id,
      runId: ctx.run.id,
      environment: ctx.environment.type,
    },
  });

  await Sentry.flush(2000);
});
