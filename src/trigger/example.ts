import { task } from "@trigger.dev/sdk";

export const exampleTask = task({
  id: "example-task",
  run: async (payload: { message?: string } = {}) => {
    const message = payload.message ?? "Hello from Trigger.dev!";
    console.log(`Running example task with message: ${message}`);

    return {
      success: true,
      message,
      timestamp: new Date().toISOString(),
    };
  },
});
