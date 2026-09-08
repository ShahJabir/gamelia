export interface AIModel {
  id: string;
  name: string;
  provider: "google" | "anthropic" | "openai" | "custom";
  description: string;
  badge?: string;
  category: string;
  ready: boolean;
}

export const AVAILABLE_MODELS: AIModel[] = [
  // --- Google Gemini (Free Tier / Testing) ---
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    provider: "google",
    description: "High-intelligence, ultra-fast generation with generous free tier",
    badge: "Recommended",
    category: "Google Gemini",
    ready: true,
  },
  {
    id: "gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    provider: "google",
    description: "Next-gen hybrid reasoning & multimodal speed",
    badge: "Fast / Smart",
    category: "Google Gemini",
    ready: true,
  },
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash Lite",
    provider: "google",
    description: "Lightweight and cost-efficient for rapid iterations",
    badge: "Free Tier",
    category: "Google Gemini",
    ready: true,
  },

  // --- Game Development (Anthropic) ---
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    description: "State-of-the-art coding and game mechanics design",
    badge: "Game Dev",
    category: "Game Development",
    ready: true,
  },
  {
    id: "fable-5-1",
    name: "Claude Fable 5.1",
    provider: "anthropic",
    description: "Specialized for game simulation, narrative & procedural rules",
    badge: "Game Systems",
    category: "Game Development",
    ready: true,
  },

  // --- 3D & World Building (OpenAI / Coming Soon) ---
  {
    id: "gpt-6-astra",
    name: "GPT-6 Astra",
    provider: "openai",
    description: "Designed for 3D model rendering and multi-modal scene synthesis",
    badge: "3D & Assets",
    category: "3D & World Building",
    ready: false,
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    description: "Omni-model for vision, physics simulation & audio",
    badge: "Multimodal",
    category: "3D & World Building",
    ready: false,
  },

  // --- Open Source & Hugging Face ---
  {
    id: "qwen-2.5-coder",
    name: "Qwen 2.5 Coder",
    provider: "custom",
    description: "Open-weights coding & logic model via Hugging Face",
    badge: "Hugging Face",
    category: "Open Source",
    ready: false,
  },
];

export const DEFAULT_MODEL_ID = "gemini-3.6-flash";

export function getModelById(id: string): AIModel {
  return AVAILABLE_MODELS.find((m) => m.id === id) || AVAILABLE_MODELS[0];
}
