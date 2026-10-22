import {
  GridIcon,
  SwordsIcon,
  ZapIcon,
  CrosshairIcon,
  ShieldIcon,
  CarIcon,
  SmileIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Suggestion = {
  icon: LucideIcon;
  label: string;
  prompt: string;
};

export const suggestions: Suggestion[] = [
  {
    icon: SwordsIcon,
    label: "Voxel survival",
    prompt:
      "Create a 3D voxel survival crafting game with a procedural block world. Include block mining, inventory collection (wood, stone, crystals), shelter crafting, day-night lighting cycles, a health/hunger HUD, and wandering nocturnal voxel monsters to defend against.",
  },
  {
    icon: GridIcon,
    label: "Ink samurai duel",
    prompt:
      "Build an atmospheric 3D samurai duel game with a black-and-white sumi-e ink wash art style. Feature two blade masters in a bamboo grove with drifting leaves, timed parrying mechanics, posture break meters, lethal counter-strikes, and dramatic ink splatter effects.",
  },
  {
    icon: ZapIcon,
    label: "Comic-book firefight",
    prompt:
      "Develop a fast-paced 3D cel-shaded arena shooter with comic-book halftone shading and bold ink outlines. Include pop-up onomatopoeia sound effects (POW!, BANG!), dodge dashes, explosive plasma guns, bouncing energy grenades, and waves of retro sci-fi robots.",
  },
  {
    icon: CrosshairIcon,
    label: "Realistic battlefield",
    prompt:
      "Build a tactical 3D military combat simulator featuring a gritty battlefield outpost. Implement realistic rifle recoil and ballistics, crouching and cover mechanics, ammo management, responsive enemy soldiers using flanking AI, and capture-the-flag objective zones.",
  },
  {
    icon: ShieldIcon,
    label: "Fight-first shooter",
    prompt:
      "Create a high-octane 3D boomer shooter with rapid movement mechanics. Include bunny-hopping, double jumps, a heavy pump shotgun, close-range melee glory kills that drop health pickups, and relentless hordes of demonic fiends inside an industrial foundry.",
  },
  {
    icon: CarIcon,
    label: "Jungle expedition drive",
    prompt:
      "Build an arcade 3D off-road vehicle expedition game through a dense tropical jungle. Feature responsive 4x4 physics, river crossings, wooden rope bridges, nitro boost pads, fuel pickups, and ancient golden relic checkpoints with a ticking race clock.",
  },
  {
    icon: SmileIcon,
    label: "Sunny kingdom platformer",
    prompt:
      "Create a vibrant 3D platformer set in a colorful sky kingdom with floating green islands and bright blue skies. Include responsive double jumps, ground pounds, spinning coin collectibles, bouncy mushroom pads, moving cloud platforms, and friendly critter NPCs.",
  },
];
