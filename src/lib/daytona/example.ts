import { Daytona } from "@daytona/sdk";

async function main() {
  const apiKey = process.env.DAYTONA_API_KEY;
  if (!apiKey) {
    console.error("Please set DAYTONA_API_KEY environment variable in .env or your shell.");
    process.exit(1);
  }

  console.log("Initializing Daytona client...");
  const daytona = new Daytona({ apiKey });

  console.log("Creating Daytona sandbox...");
  const sandbox = await daytona.create();
  console.log(`Sandbox created with ID: ${sandbox.id}`);

  try {
    console.log("Running code inside sandbox...");
    const response = await sandbox.process.codeRun('print("Hello World")');
    console.log("Output:");
    console.log(response.result);
  } finally {
    console.log("Cleaning up sandbox...");
    await sandbox.delete();
    console.log("Sandbox deleted.");
  }
}

main().catch((err) => {
  console.error("Daytona sandbox error:", err);
  process.exit(1);
});

export { main };
