"use client";

import {
  ArrowUpIcon,
  ChevronDownIcon,
  GridIcon,
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
import { createGame } from "@/lib/games/action";

export function ChatComposer() {
  return (
    <form action={createGame} className="w-full">
      <InputGroup className="bg-popover">
        <InputGroupTextarea
          name="title"
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
            <Button type="submit" size="icon-sm" className="rounded-full">
              <ArrowUpIcon />
            </Button>
          </div>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}

