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
};

export const suggestions: Suggestion[] = [
  { icon: SwordsIcon, label: "Voxel survival" },
  { icon: GridIcon, label: "Ink samurai duel" },
  { icon: ZapIcon, label: "Comic-book firefight" },
  { icon: CrosshairIcon, label: "Realistic battlefield" },
  { icon: ShieldIcon, label: "Fight-first shooter" },
  { icon: CarIcon, label: "Jungle expedition drive" },
  { icon: SmileIcon, label: "Sunny kingdom platformer" },
];
