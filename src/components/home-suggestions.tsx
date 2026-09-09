"use client";

import { useTransition, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { suggestions } from "@/lib/games/suggestions";
import { createGame } from "@/lib/games/action";

export function HomeSuggestions() {
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSelect = (label: string) => {
    if (isPending) return;
    setPendingLabel(label);
    const formData = new FormData();
    formData.set("prompt", label);
    formData.set("title", label);
    startTransition(async () => {
      try {
        await createGame(formData);
      } catch (err) {
        console.error("Failed to create game from suggestion:", err);
        setPendingLabel(null);
      }
    });
  };

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {suggestions.map((suggestion) => {
        const isThisPending = isPending && pendingLabel === suggestion.label;
        const Icon = suggestion.icon;
        return (
          <Button
            key={suggestion.label}
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => handleSelect(suggestion.label)}
            className="rounded-full font-normal text-muted-foreground transition-all cursor-pointer"
          >
            {isThisPending ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <Icon className="size-3.5" />
            )}
            {suggestion.label}
          </Button>
        );
      })}
    </div>
  );
}
