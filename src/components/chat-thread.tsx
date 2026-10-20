"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import * as Sentry from "@sentry/nextjs";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "@/components/ui/message-scroller";
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Marker, MarkerIcon, MarkerContent } from "@/components/ui/marker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireItem,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire";
import { ChatComposer } from "@/components/chat-composer";
import { DeleteGameButton } from "@/components/delete-game-button";
import { getCachedMessages, setCachedMessages } from "@/lib/cache/chat-cache";
import { DEFAULT_MODEL_ID } from "@/lib/ai/models";
import {
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  RotateCcw,
  Target,
  Flame,
  Gamepad2,
  Compass,
  Sparkles,
  Zap,
  HelpCircle,
  Check,
} from "lucide-react";
import { cn } from "cn";

interface ChatThreadProps {
  id: string;
  title?: string;
  initialMessages?: UIMessage[];
  sandboxId?: string | null;
  isPreviewOpen?: boolean;
  onOpenPreview?: () => void;
  onClosePreview?: () => void;
  onPreviewAvailable?: (sandboxId: string) => void;
  onTurnFinish?: () => void;
}

export interface FormattedToolCall {
  id: string;
  name: string;
  state: "active" | "done" | "failed";
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}

function getMessageText(
  msg:
    | UIMessage
    | {
        role: string;
        content?: string;
        parts?: Array<{ type: string; text?: string }>;
      },
): string {
  if (msg.parts && Array.isArray(msg.parts)) {
    const text = msg.parts
      .filter(
        (part): part is { type: "text"; text: string } =>
          part.type === "text" &&
          typeof (part as { text: string }).text === "string",
      )
      .map((part) => part.text)
      .join("");
    if (text) return text;
  }
  if ("content" in msg && typeof msg.content === "string") {
    return msg.content;
  }
  return "";
}

function hasToolCalls(msg: UIMessage): boolean {
  if (Array.isArray(msg.parts)) {
    return msg.parts.some(
      (p: unknown) => {
        const part = p as Record<string, unknown> | null;
        return (
          part &&
          ((typeof part.type === "string" &&
            (part.type.startsWith("tool-") ||
              part.type === "dynamic-tool" ||
              part.type === "tool-invocation")) ||
            Boolean(part.toolInvocation))
        );
      },
    );
  }
  const legacy = (msg as unknown as Record<string, unknown>).toolInvocations;
  return Array.isArray(legacy) && legacy.length > 0;
}

function extractToolInvocations(msg: UIMessage): FormattedToolCall[] {
  const tools: FormattedToolCall[] = [];

  if (Array.isArray(msg.parts)) {
    for (const p of msg.parts) {
      if (!p) continue;
      const part = p as Record<string, unknown>;

      if (typeof part.type === "string" && part.type.startsWith("tool-")) {
        const name = part.type.slice(5);
        const rawState = part.state;
        let state: "active" | "done" | "failed" = "active";

        if (rawState === "output-error" || rawState === "output-denied") {
          state = "failed";
        } else if (rawState === "output-available" || Boolean(part.output)) {
          const out = part.output as Record<string, unknown> | undefined;
          if (out && typeof out === "object" && out.success === false) {
            state = "failed";
          } else {
            state = "done";
          }
        } else {
          state = "active";
        }

        const partOutput = part.output as Record<string, unknown> | undefined;
        tools.push({
          id: (part.toolCallId as string) || `${name}-${Math.random()}`,
          name,
          state,
          input: part.input as Record<string, unknown> | undefined,
          output: partOutput,
          error:
            (part.errorText as string | undefined) ||
            (partOutput?.error as string | undefined),
        });
      } else if (part.type === "dynamic-tool") {
        const name = (part.toolName as string) || "tool";
        const rawState = part.state;
        let state: "active" | "done" | "failed" = "active";

        if (rawState === "output-error" || rawState === "output-denied") {
          state = "failed";
        } else if (rawState === "output-available" || Boolean(part.output)) {
          const out = part.output as Record<string, unknown> | undefined;
          if (out && typeof out === "object" && out.success === false) {
            state = "failed";
          } else {
            state = "done";
          }
        } else {
          state = "active";
        }

        const partOutput = part.output as Record<string, unknown> | undefined;
        tools.push({
          id: (part.toolCallId as string) || `${name}-${Math.random()}`,
          name,
          state,
          input: part.input as Record<string, unknown> | undefined,
          output: partOutput,
          error:
            (part.errorText as string | undefined) ||
            (partOutput?.error as string | undefined),
        });
      } else if (part.type === "tool-invocation" && part.toolInvocation) {
        const ti = part.toolInvocation as Record<string, unknown>;
        const tiResult = (ti.result ?? ti.output) as Record<string, unknown> | undefined;
        const state: "active" | "done" | "failed" =
          ti.state === "result" || ti.state === "output-available" || Boolean(tiResult)
            ? tiResult?.success === false
              ? "failed"
              : "done"
            : ti.state === "error" || ti.state === "output-error"
              ? "failed"
              : "active";
        tools.push({
          id: (ti.toolCallId as string) || `${String(ti.toolName)}-${Math.random()}`,
          name: String(ti.toolName),
          state,
          input: ti.args as Record<string, unknown> | undefined,
          output: tiResult,
          error: tiResult?.error as string | undefined,
        });
      }
    }
  }

  const legacyInvocations = (msg as unknown as Record<string, unknown>)
    .toolInvocations;
  if (Array.isArray(legacyInvocations)) {
    for (const item of legacyInvocations) {
      const ti = item as Record<string, unknown>;
      const toolCallId = ti.toolCallId as string;
      if (tools.some((t) => t.id === toolCallId)) continue;
      const tiResult = ti.result as Record<string, unknown> | undefined;
      const state: "active" | "done" | "failed" =
        ti.state === "result"
          ? tiResult?.success === false
            ? "failed"
            : "done"
          : ti.state === "error"
            ? "failed"
            : "active";
      tools.push({
        id: toolCallId || `${String(ti.toolName)}-${Math.random()}`,
        name: String(ti.toolName),
        state,
        input: ti.args as Record<string, unknown> | undefined,
        output: tiResult,
        error: tiResult?.error as string | undefined,
      });
    }
  }

  return tools;
}

function getToolActionText(
  name: string,
  state: "active" | "done" | "failed",
  input?: Record<string, unknown>,
  error?: string,
): string {
  const rawPath = input?.filePath || input?.directoryPath;
  const filePath = typeof rawPath === "string" ? rawPath : "";

  if (state === "active") {
    switch (name) {
      case "write_file":
        return filePath ? `Writing ${filePath}...` : "Writing file...";
      case "replace_text":
        return filePath ? `Updating ${filePath}...` : "Updating file...";
      case "read_file":
        return filePath ? `Reading ${filePath}...` : "Reading file...";
      case "list_files":
        return filePath ? `Listing ${filePath}...` : "Listing files...";
      case "delete_file":
        return filePath ? `Deleting ${filePath}...` : "Deleting file...";
      default:
        return `Executing ${name}...`;
    }
  }

  if (state === "failed") {
    const errSummary = error ? `: ${error}` : "";
    switch (name) {
      case "write_file":
        return `Failed writing ${filePath || "file"}${errSummary}`;
      case "replace_text":
        return `Failed updating ${filePath || "file"}${errSummary}`;
      case "read_file":
        return `Failed reading ${filePath || "file"}${errSummary}`;
      case "list_files":
        return `Failed listing files${errSummary}`;
      case "delete_file":
        return `Failed deleting ${filePath || "file"}${errSummary}`;
      default:
        return `Failed ${name}${errSummary}`;
    }
  }

  switch (name) {
    case "write_file":
      return filePath ? `Wrote ${filePath}` : "Wrote file";
    case "replace_text":
      return filePath ? `Updated ${filePath}` : "Updated file";
    case "read_file":
      return filePath ? `Read ${filePath}` : "Read file";
    case "list_files":
      return filePath ? `Listed ${filePath}` : "Listed files";
    case "delete_file":
      return filePath ? `Deleted ${filePath}` : "Deleted file";
    default:
      return `Finished ${name}`;
  }
}

function ToolCallMarker({ tool }: { tool: FormattedToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const actionText = getToolActionText(
    tool.name,
    tool.state,
    tool.input,
    tool.error,
  );
  const hasDetails = Boolean(tool.error || tool.output?.message || tool.input);

  return (
    <div className="my-1.5 w-full rounded-lg border border-border/40 bg-muted/20 px-2.5 py-1.5 text-xs transition-colors hover:bg-muted/40">
      <Marker
        variant="default"
        className={cn(
          "cursor-pointer items-center justify-between text-xs",
          hasDetails ? "select-none" : "",
        )}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <MarkerIcon>
            {tool.state === "active" && (
              <Loader2 className="size-3.5 animate-spin text-primary" />
            )}
            {tool.state === "done" && (
              <CheckCircle2 className="size-3.5 text-emerald-500" />
            )}
            {tool.state === "failed" && (
              <AlertCircle className="size-3.5 text-destructive" />
            )}
          </MarkerIcon>

          <MarkerContent className="truncate font-mono text-[11px] text-foreground/80">
            {actionText}
          </MarkerContent>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {tool.state === "active" && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              active
            </span>
          )}
          {tool.state === "done" && (
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              done
            </span>
          )}
          {tool.state === "failed" && (
            <span className="inline-flex items-center rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
              failed
            </span>
          )}

          {hasDetails && (
            <ChevronDown
              className={cn(
                "size-3 text-muted-foreground transition-transform duration-200",
                expanded && "rotate-180",
              )}
            />
          )}
        </div>
      </Marker>

      {expanded && (
        <div className="mt-2 space-y-1.5 border-t border-border/30 pt-2 font-mono text-[10px] text-muted-foreground">
          {tool.error && (
            <div className="rounded bg-destructive/10 p-1.5 text-destructive">
              <span className="font-semibold">Error:</span> {tool.error}
            </div>
          )}
          {Boolean(tool.output?.message) && (
            <div className="text-foreground/80">
              {String(tool.output?.message)}
            </div>
          )}
          {tool.input && Object.keys(tool.input).length > 0 && (
            <div className="max-h-32 overflow-auto rounded bg-background/60 p-2 text-muted-foreground">
              {Object.entries(tool.input).map(([key, val]) => (
                <div key={key} className="truncate">
                  <span className="text-foreground/70">{key}:</span>{" "}
                  {typeof val === "string" && val.length > 80
                    ? `${val.slice(0, 80)}... (${val.length} chars)`
                    : JSON.stringify(val)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const DIMENSION_CONFIG: Record<
  string,
  {
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  loop: {
    label: "Core Loop",
    sublabel: "Core mechanics & repeating cycle",
    icon: RotateCcw,
  },
  goal: {
    label: "Objective",
    sublabel: "Goals & win/loss conditions",
    icon: Target,
  },
  challenge: {
    label: "Challenge",
    sublabel: "Obstacles, enemies & hazard design",
    icon: Flame,
  },
  controls: {
    label: "Controls",
    sublabel: "Input mapping & movement physics",
    icon: Gamepad2,
  },
  world: {
    label: "World & Setting",
    sublabel: "Environment, layout & theme",
    icon: Compass,
  },
  look: {
    label: "Visual Style",
    sublabel: "Aesthetics, lighting & camera view",
    icon: Sparkles,
  },
  feel: {
    label: "Juice & Feel",
    sublabel: "Feedback, sound & kinetic pacing",
    icon: Zap,
  },
};

function parseAskPlayerInput(input?: Record<string, unknown>) {
  const dimension = (
    typeof input?.dimension === "string" ? input.dimension : "loop"
  ).toLowerCase();
  const question =
    typeof input?.question === "string" ? input.question : "Design Decision";
  const rawOptions = Array.isArray(input?.options) ? input.options : [];
  const options = rawOptions
    .filter(
      (opt): opt is Record<string, unknown> =>
        typeof opt === "object" && opt !== null,
    )
    .map((opt, idx) => ({
      id: typeof opt.id === "string" ? opt.id : `option-${idx}`,
      label: typeof opt.label === "string" ? opt.label : `Option ${idx + 1}`,
      description: typeof opt.description === "string" ? opt.description : "",
    }));

  return { dimension, question, options };
}

interface AskPlayerQuestionnaireProps {
  tool: FormattedToolCall;
  isSubmitting?: boolean;
  onAnswer: (output: { id: string; label: string }) => void;
}

function AskPlayerQuestionnaire({
  tool,
  isSubmitting,
  onAnswer,
}: AskPlayerQuestionnaireProps) {
  const { dimension, question, options } = parseAskPlayerInput(tool.input);
  const [selectedId, setSelectedId] = useState<string>("");
  const [isAnswering, setIsAnswering] = useState(false);

  const dimConfig =
    DIMENSION_CONFIG[dimension] || {
      label: dimension ? dimension.toUpperCase() : "GAME DESIGN",
      sublabel: "Game Decision",
      icon: HelpCircle,
    };
  const DimIcon = dimConfig.icon;

  const isAnswered =
    tool.state === "done" ||
    Boolean(tool.output?.id || tool.output?.label);

  if (isAnswered) {
    const chosenId = (tool.output?.id as string) || "";
    const chosenLabel =
      (tool.output?.label as string) ||
      options.find((o) => o.id === chosenId)?.label ||
      chosenId;
    const chosenOption = options.find(
      (o) => o.id === chosenId || o.label === chosenLabel,
    );
    const chosenDesc = chosenOption?.description;

    return (
      <div className="my-2.5 w-full rounded-xl border border-border/60 bg-muted/20 p-3.5 transition-colors dark:bg-muted/10">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <DimIcon className="size-3" />
            </span>
            <span className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">
              {dimConfig.label}
            </span>
          </div>
          <Badge
            variant="outline"
            className="h-5 gap-1 border-emerald-500/30 bg-emerald-500/10 px-2 text-[10px] font-medium text-emerald-600 dark:text-emerald-400"
          >
            <CheckCircle2 className="size-3" />
            <span>Decided</span>
          </Badge>
        </div>

        <p className="text-xs font-medium text-foreground mb-2">
          {question}
        </p>

        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Check className="size-3.5 text-emerald-500 shrink-0" />
            <span>{chosenLabel}</span>
          </div>
          {chosenDesc && (
            <p className="mt-1 pl-5 text-[11px] text-muted-foreground leading-relaxed">
              {chosenDesc}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (tool.state === "failed") {
    return (
      <div className="my-2.5 w-full rounded-xl border border-destructive/30 bg-destructive/5 p-3.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground">
              {dimConfig.label}
            </span>
          </div>
          <Badge
            variant="destructive"
            className="h-5 gap-1 text-[10px]"
          >
            <AlertCircle className="size-3" />
            <span>Dismissed</span>
          </Badge>
        </div>
        <p className="text-xs text-foreground/80">{question}</p>
        {tool.error && (
          <p className="mt-1 text-[11px] text-destructive">{tool.error}</p>
        )}
      </div>
    );
  }

  // Active state: if options are still being received from streaming tool input
  if (options.length === 0) {
    return (
      <div className="my-2.5 flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 p-4 text-xs text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-primary" />
        <span>Preparing game design question...</span>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedId || isAnswering || isSubmitting) return;
    const choice = options.find((opt) => opt.id === selectedId);
    if (!choice) return;

    setIsAnswering(true);
    onAnswer({ id: choice.id, label: choice.label });
  };

  const isBusy = isAnswering || isSubmitting;

  return (
    <div className="my-3 w-full rounded-xl border border-primary/30 bg-card p-4 shadow-sm transition-all dark:bg-card/90">
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-border/40 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <DimIcon className="size-3.5" />
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-semibold tracking-wide uppercase text-foreground">
              {dimConfig.label}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {dimConfig.sublabel}
            </span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          <span className="size-1.5 rounded-full bg-primary animate-pulse" />
          Player Choice
        </span>
      </div>

      <Questionnaire
        defaultItem="decision"
        items={[{ name: "decision" }]}
        shortcuts="numbers"
        onSubmit={handleSubmit}
        className="gap-3"
      >
        <QuestionnaireItem name="decision" required>
          <QuestionnaireTitle className="text-sm font-semibold text-foreground mb-1 leading-snug">
            {question}
          </QuestionnaireTitle>
          <QuestionnaireDescription className="text-xs text-muted-foreground mb-3">
            Select an option to direct this game design decision:
          </QuestionnaireDescription>

          <QuestionnaireChoices className="grid gap-2">
            {options.map((opt) => (
              <QuestionnaireChoice
                key={opt.id}
                value={opt.id}
                checked={selectedId === opt.id}
                onChange={() => setSelectedId(opt.id)}
                disabled={isBusy}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-foreground">
                    {opt.label}
                  </span>
                  {opt.description && (
                    <QuestionnaireChoiceDescription className="text-[11px] text-muted-foreground leading-relaxed">
                      {opt.description}
                    </QuestionnaireChoiceDescription>
                  )}
                </div>
              </QuestionnaireChoice>
            ))}
          </QuestionnaireChoices>
        </QuestionnaireItem>

        <QuestionnaireActions className="mt-3 pt-1">
          <span className="col-start-1 row-start-1 text-[11px] font-mono text-muted-foreground/80">
            Press 1-{options.length} or click to select
          </span>
          <QuestionnaireSubmit
            size="sm"
            disabled={!selectedId || isBusy}
            className="h-8 gap-1.5 px-3 text-xs font-medium"
          >
            {isBusy ? (
              <>
                <Loader2 className="size-3 animate-spin" />
                <span>Applying Decision...</span>
              </>
            ) : (
              <>
                <span>Confirm Decision</span>
                <Check className="size-3.5" />
              </>
            )}
          </QuestionnaireSubmit>
        </QuestionnaireActions>
      </Questionnaire>
    </div>
  );
}

function sanitizeUIMessages(msgs: UIMessage[]): UIMessage[] {
  return (msgs ?? []).filter((m) => {
    if (m.role === "assistant") {
      return getMessageText(m).trim().length > 0 || hasToolCalls(m);
    }
    return true;
  });
}

function formatErrorMessage(error: Error): string {
  try {
    const parsed = JSON.parse(error.message);
    if (parsed.error) return parsed.error;
  } catch {
    // Not JSON
  }
  return error.message || "Failed to generate response.";
}

export function ChatThread({
  id,
  title,
  initialMessages = [],
  sandboxId,
  isPreviewOpen,
  onOpenPreview,
  onPreviewAvailable,
  onTurnFinish,
}: ChatThreadProps) {
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL_ID);
  const [hasFetchedPreview, setHasFetchedPreview] = useState<boolean>(false);
  const previewAvailable = Boolean(sandboxId) || hasFetchedPreview;
  const autoTriggeredRef = useRef(false);

  const checkPreviewAvailability = useCallback(async () => {
    try {
      const res = await fetch(`/api/game/${id}/preview`, {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url || data.sandboxId) {
          setHasFetchedPreview(true);
          if (data.sandboxId && onPreviewAvailable) {
            onPreviewAvailable(data.sandboxId);
          }
        }
      }
    } catch {
      // Preview not ready yet
    }
  }, [id, onPreviewAvailable]);

  useEffect(() => {
    if (sandboxId || hasFetchedPreview) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void checkPreviewAvailability();
  }, [sandboxId, hasFetchedPreview, checkPreviewAvailability]);

  const cleanInitialMessages = sanitizeUIMessages(initialMessages);

  const {
    messages,
    setMessages,
    sendMessage,
    regenerate,
    addToolOutput,
    status,
    stop,
    error,
  } = useChat({
    id,
    messages: cleanInitialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onFinish: async ({ messages: finalMessages }) => {
      const clean = sanitizeUIMessages(finalMessages);
      if (clean.length > 0) {
        await setCachedMessages(id, clean);
        Sentry.logger.info("Cached messages to IndexedDB", {
          game_id: id,
          message_count: clean.length,
        });
      }
      checkPreviewAvailability();
      onTurnFinish?.();
    },
  });

  const handleAnswerQuestionnaire = useCallback(
    async (toolCallId: string, output: { id: string; label: string }) => {
      try {
        if (typeof addToolOutput === "function") {
          (addToolOutput as any)({
            tool: "ask_player",
            toolCallId,
            output,
            options: {
              body: { model: selectedModel },
            },
          });
        }
      } catch (err) {
        Sentry.logger.error("Failed to submit questionnaire output", {
          game_id: id,
          tool_call_id: toolCallId,
          error_message: err instanceof Error ? err.message : String(err),
        });
        Sentry.captureException(err, {
          tags: { game_id: id, component: "chat-thread" },
        });
      }
    },
    [addToolOutput, selectedModel, id],
  );

  // Track status transitions to trigger onTurnFinish and refresh credits whenever streaming completes
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (
      (prevStatusRef.current === "streaming" ||
        prevStatusRef.current === "submitted") &&
      status === "ready"
    ) {
      onTurnFinish?.();
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
    prevStatusRef.current = status;
  }, [status, onTurnFinish]);

  // Periodically refresh sidebar credits while a game is actively building/streaming
  useEffect(() => {
    if (status === "streaming" || status === "submitted") {
      const interval = setInterval(() => {
        window.dispatchEvent(new CustomEvent("credits-updated"));
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [status]);

  // Guarantee IndexedDB cache stays synced whenever generation completes or messages update
  useEffect(() => {
    if (status === "ready" && messages.length > 0) {
      const clean = sanitizeUIMessages(messages);
      if (clean.length > 0) {
        setCachedMessages(id, clean).catch((err) => {
          Sentry.logger.warn("Failed to sync IndexedDB cache", {
            game_id: id,
            error_message: err instanceof Error ? err.message : String(err),
          });
        });
      }
    }
  }, [status, messages, id]);

  const handleSendMessage = async (text: string, modelToUse?: string) => {
    if (!text.trim()) return;
    setInput("");

    const model = modelToUse || selectedModel;

    // Immediately cache the new user message
    const userMsg: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", text: text.trim() }],
    };
    await setCachedMessages(id, [...sanitizeUIMessages(messages), userMsg]);

    // Send through AI SDK useChat with selected model in body
    await sendMessage(
      { text: text.trim() },
      {
        body: { model },
      },
    );
  };

  // Auto-respond to initial prompt when redirected from home page
  useEffect(() => {
    if (autoTriggeredRef.current) return;
    const clean = sanitizeUIMessages(messages);
    if (clean.length > 0 && clean[clean.length - 1]?.role === "user") {
      autoTriggeredRef.current = true;
      regenerate({
        body: { model: selectedModel },
      }).catch((err) => {
        Sentry.logger.error("Auto-generate response error", {
          game_id: id,
          model: selectedModel,
          error_message: err instanceof Error ? err.message : String(err),
        });
        Sentry.captureException(err, {
          tags: { game_id: id, component: "chat-thread" },
        });
      });
    }
  }, [messages, selectedModel, regenerate, id]);

  useEffect(() => {
    let isMounted = true;

    async function syncCache() {
      try {
        // 1. Fetch from browser IndexedDB cache first
        const cached = await getCachedMessages(id);
        if (!isMounted) return;

        const cleanCached = cached ? sanitizeUIMessages(cached) : [];
        if (cleanCached.length > cleanInitialMessages.length) {
          setMessages(cleanCached);
          return;
        }

        // 2. If browser cache is not seeded yet, seed it with initial Neon DB messages
        if (cleanInitialMessages.length > 0) {
          await setCachedMessages(id, cleanInitialMessages);
          return;
        }

        // 3. If neither has messages, query Neon DB API route to verify
        const res = await fetch(`/api/chat?id=${encodeURIComponent(id)}`);
        if (res.ok) {
          const data = await res.json();
          if (!isMounted) return;
          const neonMessages = sanitizeUIMessages(
            (data.messages ?? []) as UIMessage[],
          );
          if (neonMessages.length > 0) {
            setMessages(neonMessages);
            await setCachedMessages(id, neonMessages);
          }
        }
      } catch (err) {
        Sentry.logger.warn("Failed to sync cached messages", {
          game_id: id,
          error_message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    syncCache();

    return () => {
      isMounted = false;
    };
  }, [id, cleanInitialMessages, setMessages]);

  const isLoading = status === "submitted" || status === "streaming";

  const displayMessages = messages.filter(
    (msg) =>
      msg.role !== "assistant" ||
      getMessageText(msg).trim().length > 0 ||
      hasToolCalls(msg),
  );

  // Find index of the latest assistant message to conditionally display the Preview button
  const latestAssistantIndex = displayMessages
    .map((m, idx) => (m.role === "assistant" ? idx : -1))
    .filter((idx) => idx !== -1)
    .pop();

  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden">
      {/* Sticky Header with Chat Title, Preview Toggle, and Delete Icon Button */}
      <header className="sticky top-0 z-10 flex h-13 shrink-0 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2 overflow-hidden">
          <h1
            className="truncate text-sm font-semibold text-foreground"
            title={title || "New Game"}
          >
            {title || "New Game"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {previewAvailable && !isPreviewOpen && onOpenPreview && (
            <Button
              variant="outline"
              size="xs"
              onClick={onOpenPreview}
              className="h-7 gap-1.5 px-2.5 text-xs font-medium border-border/80 text-foreground hover:bg-accent"
              title="Open game preview"
            >
              <Play className="size-3 text-primary fill-primary" />
              <span>Preview Game</span>
            </Button>
          )}
          <DeleteGameButton gameId={id} gameTitle={title} variant="header" />
        </div>
      </header>

      {/* Main Chat Area */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden">
        <MessageScrollerProvider autoScroll defaultScrollPosition="end">
          <MessageScroller className="size-full min-h-0">
            <MessageScrollerViewport>
              <MessageScrollerContent className="mx-auto w-full max-w-2xl p-6">
                {displayMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                    <p className="text-base font-medium text-foreground">
                      {title || "New Game"}
                    </p>
                    <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                      No message history yet. Describe your ideas or ask
                      questions below to start designing your game.
                    </p>
                  </div>
                ) : (
                  displayMessages.map((msg, i) => {
                    const text = getMessageText(msg);
                    const isAssistant = msg.role === "assistant";
                    const toolCalls = isAssistant
                      ? extractToolInvocations(msg)
                      : [];
                    const regularTools = toolCalls.filter(
                      (t) => t.name !== "ask_player",
                    );
                    const askPlayerTools = toolCalls.filter(
                      (t) => t.name === "ask_player",
                    );
                    const isLatestAssistant =
                      isAssistant && i === latestAssistantIndex;

                    return (
                      <MessageScrollerItem
                        key={msg.id ?? i}
                        messageId={msg.id ?? `msg-${i}`}
                        scrollAnchor={!isAssistant}
                      >
                        {isAssistant ? (
                          <Message>
                            <MessageAvatar className="size-8 self-start rounded-lg bg-transparent">
                              <Image
                                src="/logo.svg"
                                alt="Assistant"
                                width={32}
                                height={32}
                              />
                            </MessageAvatar>
                            <MessageContent className="w-full min-w-0">
                              {/* Standard tool call markers */}
                              {regularTools.length > 0 && (
                                <div className="mb-2 space-y-1">
                                  {regularTools.map((tool) => (
                                    <ToolCallMarker key={tool.id} tool={tool} />
                                  ))}
                                </div>
                              )}

                              {/* Assistant Text Bubble */}
                              {text.trim().length > 0 && (
                                <Bubble variant="ghost">
                                  <BubbleContent>{text}</BubbleContent>
                                </Bubble>
                              )}

                              {/* Human-in-the-loop Ask Player Questionnaire */}
                              {askPlayerTools.length > 0 && (
                                <div className="mt-2 space-y-3">
                                  {askPlayerTools.map((tool) => (
                                    <AskPlayerQuestionnaire
                                      key={tool.id}
                                      tool={tool}
                                      isSubmitting={isLoading}
                                      onAnswer={(output) =>
                                        handleAnswerQuestionnaire(tool.id, output)
                                      }
                                    />
                                  ))}
                                </div>
                              )}

                              {/* Game Preview Action Button (displayed after finishing chat when preview is available) */}
                              {previewAvailable &&
                                !isLoading &&
                                isLatestAssistant &&
                                onOpenPreview && (
                                  <div className="mt-3 flex items-center gap-2">
                                    <Button
                                      size="xs"
                                      variant="secondary"
                                      onClick={onOpenPreview}
                                      className="gap-1.5 border border-border/70 text-xs font-medium shadow-sm hover:border-primary/50 hover:bg-accent"
                                    >
                                      <Play className="size-3 text-primary fill-primary" />
                                      <span>
                                        {isPreviewOpen
                                          ? "Focus Game Preview"
                                          : "Open Game Preview"}
                                      </span>
                                    </Button>
                                  </div>
                                )}
                            </MessageContent>
                          </Message>
                        ) : (
                          <Message align="end">
                            <MessageContent>
                              <Bubble variant="secondary">
                                <BubbleContent>{text}</BubbleContent>
                              </Bubble>
                            </MessageContent>
                          </Message>
                        )}
                      </MessageScrollerItem>
                    );
                  })
                )}
                {isLoading &&
                  displayMessages.length > 0 &&
                  displayMessages[displayMessages.length - 1]?.role ===
                    "user" && (
                    <MessageScrollerItem key="ai-thinking" scrollAnchor={false}>
                      <Message>
                        <MessageAvatar className="size-8 self-start rounded-lg bg-transparent">
                          <Image
                            src="/logo.svg"
                            alt="Assistant"
                            width={32}
                            height={32}
                          />
                        </MessageAvatar>
                        <MessageContent>
                          <Bubble variant="ghost">
                            <BubbleContent className="flex items-center gap-2 py-1 text-xs italic text-muted-foreground">
                              <span className="inline-block size-1.5 animate-pulse rounded-full bg-primary" />
                              Thinking...
                            </BubbleContent>
                          </Bubble>
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  )}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton className="bottom-28 z-20 shadow-md" />
            <div className="mx-auto w-full max-w-2xl shrink-0 px-6 pb-6">
              {error && (
                <div className="mb-2 flex items-center justify-between rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <span>{formatErrorMessage(error)}</span>
                  <button
                    type="button"
                    className="ml-2 underline font-medium hover:opacity-80"
                    onClick={() => {
                      regenerate({ body: { model: selectedModel } });
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}
              <ChatComposer
                value={input}
                onValueChange={setInput}
                model={selectedModel}
                onModelChange={setSelectedModel}
                onSubmit={handleSendMessage}
                isLoading={isLoading}
                onStop={stop}
                placeholder="Ask a follow-up or describe changes..."
              />
            </div>
          </MessageScroller>
        </MessageScrollerProvider>
      </div>
    </div>
  );
}
