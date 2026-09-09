"use client";

import { useState, useTransition } from "react";
import {
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  GridIcon,
  Loader2Icon,
  SquareIcon,
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createGame } from "@/lib/games/action";
import { cn } from "@/lib/utils";
import {
  AVAILABLE_MODELS,
  DEFAULT_MODEL_ID,
  getModelById,
} from "@/lib/ai/models";

export interface ChatComposerProps {
  value?: string;
  onValueChange?: (value: string) => void;
  onSubmit?: (value: string, modelId?: string) => void | Promise<void>;
  model?: string;
  onModelChange?: (model: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  onStop?: () => void;
  className?: string;
}

export function ChatComposer({
  value,
  onValueChange,
  onSubmit,
  model,
  onModelChange,
  placeholder = "Describe the game you want to build...",
  disabled = false,
  isLoading = false,
  onStop,
  className,
}: ChatComposerProps = {}) {
  const [internalValue, setInternalValue] = useState("");
  const [internalModel, setInternalModel] = useState<string>(DEFAULT_MODEL_ID);
  const [isPending, startTransition] = useTransition();

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const selectedModelId = model !== undefined ? model : internalModel;
  const currentModelObj = getModelById(selectedModelId);

  const handleValueChange = (val: string) => {
    if (!isControlled) {
      setInternalValue(val);
    }
    onValueChange?.(val);
  };

  const handleModelSelect = (id: string) => {
    if (model === undefined) {
      setInternalModel(id);
    }
    onModelChange?.(id);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = currentValue.trim();
    if (!text || disabled || isLoading || isPending) return;

    if (onSubmit) {
      if (!isControlled) {
        setInternalValue("");
      }
      await onSubmit(text, selectedModelId);
    } else {
      const formData = new FormData();
      formData.set("prompt", text);
      formData.set("title", text);
      formData.set("model", selectedModelId);

      startTransition(async () => {
        try {
          await createGame(formData);
        } catch (err) {
          console.error("[ChatComposer] Failed to create game:", err);
        }
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const categories = Array.from(
    new Set(AVAILABLE_MODELS.map((m) => m.category)),
  );

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("w-full", className)}
    >
      <input type="hidden" name="model" value={selectedModelId} />
      <input type="hidden" name="prompt" value={currentValue} />
      <InputGroup className="bg-popover">
        <InputGroupTextarea
          name="title"
          value={currentValue}
          onChange={(e) => handleValueChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={disabled || isLoading || isPending}
          className="field-sizing-content max-h-48 min-h-10"
        />
        <InputGroupAddon align="block-end">
          <div className="flex w-full items-center justify-between">
            <DropdownMenu>
              <DropdownMenuTrigger
                type="button"
                className="flex h-6 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                <GridIcon className="size-3.5" />
                <span>{currentModelObj.name}</span>
                {currentModelObj.badge && (
                  <span className="rounded bg-primary/10 px-1 py-0.5 text-[10px] font-normal text-primary">
                    {currentModelObj.badge}
                  </span>
                )}
                <ChevronDownIcon className="size-3 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                side="top"
                className="w-76 max-h-80 overflow-y-auto p-1.5"
              >
                {categories.map((category, catIndex) => (
                  <DropdownMenuGroup key={category}>
                    {catIndex > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuLabel className="px-2 py-1 text-[11px] font-semibold text-muted-foreground/80">
                      {category}
                    </DropdownMenuLabel>
                    {AVAILABLE_MODELS.filter((m) => m.category === category).map(
                      (m) => (
                        <DropdownMenuItem
                          key={m.id}
                          onClick={() => handleModelSelect(m.id)}
                          className="flex cursor-pointer items-center justify-between px-2 py-1.5"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                              {m.name}
                              {m.badge && (
                                <span className="rounded bg-secondary px-1 text-[10px] font-normal text-muted-foreground">
                                  {m.badge}
                                </span>
                              )}
                            </span>
                            <span className="line-clamp-1 text-[11px] text-muted-foreground">
                              {m.description}
                            </span>
                          </div>
                          {m.id === selectedModelId && (
                            <CheckIcon className="ml-2 size-3.5 shrink-0 text-primary" />
                          )}
                        </DropdownMenuItem>
                      ),
                    )}
                  </DropdownMenuGroup>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {isPending ? (
              <Button
                type="button"
                size="icon-sm"
                className="rounded-full"
                disabled
              >
                <Loader2Icon className="size-3.5 animate-spin" />
              </Button>
            ) : isLoading && onStop ? (
              <Button
                type="button"
                onClick={onStop}
                size="icon-sm"
                className="rounded-full"
                title="Stop generating"
              >
                <SquareIcon className="size-3 fill-current" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon-sm"
                className="rounded-full"
                disabled={disabled || !currentValue.trim() || isLoading || isPending}
              >
                <ArrowUpIcon />
              </Button>
            )}
          </div>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}

