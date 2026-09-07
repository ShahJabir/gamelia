"use client";

import {
  ArrowUpIcon,
  ChevronDownIcon,
  GridIcon,
  SwordsIcon,
  ZapIcon,
  CrosshairIcon,
  ShieldIcon,
  CarIcon,
  SmileIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const suggestions = [
  { icon: SwordsIcon, label: "Voxel survival" },
  { icon: GridIcon, label: "Ink samurai duel" },
  { icon: ZapIcon, label: "Comic-book firefight" },
  { icon: CrosshairIcon, label: "Realistic battlefield" },
  { icon: ShieldIcon, label: "Fight-first shooter" },
  { icon: CarIcon, label: "Jungle expedition drive" },
  { icon: SmileIcon, label: "Sunny kingdom platformer" },
];

export function ChatComposer() {
  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-3">
      <InputGroup className="bg-popover">
        <InputGroupTextarea
          placeholder="Describe the game you want to build..."
          rows={1}
          className="field-sizing-content max-h-48 min-h-10"
        />
        <InputGroupAddon align="block-end">
          <div className="flex w-full items-center justify-between">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-6 cursor-pointer items-center gap-1 rounded-md px-1.5 text-xs text-muted-foreground hover:text-foreground">
                <GridIcon className="size-3.5" />
                Kimi K3
                <ChevronDownIcon className="size-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top">
                <DropdownMenuItem>Kimi K3</DropdownMenuItem>
                <DropdownMenuItem>GPT-4o</DropdownMenuItem>
                <DropdownMenuItem>Claude Sonnet</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="icon-sm" className="rounded-full">
              <ArrowUpIcon />
            </Button>
          </div>
        </InputGroupAddon>
      </InputGroup>

      <div className="flex flex-wrap justify-center gap-2">
        {suggestions.map((suggestion) => (
          <Button key={suggestion.label} variant="outline" size="sm" className="rounded-full font-normal text-muted-foreground">
            <suggestion.icon />
            {suggestion.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
