import { workflowInstructions } from "./workflow";
import { runtimeInstructions } from "./runtime";

/**
 * Combined array of game instructions for designing, building, and running games in Daytona.
 */
export const gameInstructions: string[] = [
  ...workflowInstructions,
  ...runtimeInstructions,
];

/**
 * Formatted system prompt combining all game instructions into a unified string.
 */
export const systemPrompt: string = gameInstructions.join("\n\n");

export { workflowInstructions } from "./workflow";
export { runtimeInstructions } from "./runtime";
