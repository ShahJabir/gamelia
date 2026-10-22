"use client";

import { useTransition, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { suggestions, type Suggestion } from "@/lib/games/suggestions";
import { createGame } from "@/lib/games/action";

export function HomeSuggestions() {
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSelect = (suggestion: Suggestion) => {
    if (isPending) return;
    setPendingLabel(suggestion.label);
    const formData = new FormData();
    formData.set("prompt", suggestion.prompt);
    formData.set("title", suggestion.label);
    startTransition(async () => {
      try {
        await createGame(formData);
      } catch (err) {
        Sentry.logger.error("Failed to create game from suggestion", {
          suggestion_label: suggestion.label,
          error_message: err instanceof Error ? err.message : String(err),
        });
        Sentry.captureException(err, {
          tags: { component: "home-suggestions", suggestion: suggestion.label },
        });
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
            onClick={() => handleSelect(suggestion)}
            className="rounded-full font-normal text-muted-foreground transition-all cursor-pointer hover:border-primary/50 hover:text-foreground"
            title={suggestion.prompt}
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
