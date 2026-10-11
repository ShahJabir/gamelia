"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
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
  input?: Record<string, any>;
  output?: Record<string, any>;
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
      (p: any) =>
        p &&
        ((typeof p.type === "string" &&
          (p.type.startsWith("tool-") ||
            p.type === "dynamic-tool" ||
            p.type === "tool-invocation")) ||
          p.toolInvocation),
    );
  }
  return (
    Array.isArray((msg as any).toolInvocations) &&
    (msg as any).toolInvocations.length > 0
  );
}

function extractToolInvocations(msg: UIMessage): FormattedToolCall[] {
  const tools: FormattedToolCall[] = [];

  if (Array.isArray(msg.parts)) {
    for (const part of msg.parts as any[]) {
      if (!part) continue;

      if (typeof part.type === "string" && part.type.startsWith("tool-")) {
        const name = part.type.slice(5);
        const rawState = part.state;
        let state: "active" | "done" | "failed" = "active";

        if (rawState === "output-error" || rawState === "output-denied") {
          state = "failed";
        } else if (rawState === "output-available") {
          if (
            part.output &&
            typeof part.output === "object" &&
            part.output.success === false
          ) {
            state = "failed";
          } else {
            state = "done";
          }
        } else {
          state = "active";
        }

        tools.push({
          id: part.toolCallId || `${name}-${Math.random()}`,
          name,
          state,
          input: part.input,
          output: part.output,
          error: part.errorText || (part.output?.error as string | undefined),
        });
      } else if (part.type === "dynamic-tool") {
        const name = part.toolName || "tool";
        const rawState = part.state;
        let state: "active" | "done" | "failed" = "active";

        if (rawState === "output-error" || rawState === "output-denied") {
          state = "failed";
        } else if (rawState === "output-available") {
          if (
            part.output &&
            typeof part.output === "object" &&
            part.output.success === false
          ) {
            state = "failed";
          } else {
            state = "done";
          }
        } else {
          state = "active";
        }

        tools.push({
          id: part.toolCallId || `${name}-${Math.random()}`,
          name,
          state,
          input: part.input,
          output: part.output,
          error: part.errorText || (part.output?.error as string | undefined),
        });
      } else if (part.type === "tool-invocation" && part.toolInvocation) {
        const ti = part.toolInvocation;
        const state: "active" | "done" | "failed" =
          ti.state === "result"
            ? ti.result?.success === false
              ? "failed"
              : "done"
            : ti.state === "error"
              ? "failed"
              : "active";
        tools.push({
          id: ti.toolCallId || `${ti.toolName}-${Math.random()}`,
          name: ti.toolName,
          state,
          input: ti.args,
          output: ti.result,
          error: ti.result?.error,
        });
      }
    }
  }

  const legacyInvocations = (msg as any).toolInvocations;
  if (Array.isArray(legacyInvocations)) {
    for (const ti of legacyInvocations) {
      if (tools.some((t) => t.id === ti.toolCallId)) continue;
      const state: "active" | "done" | "failed" =
        ti.state === "result"
          ? ti.result?.success === false
            ? "failed"
            : "done"
          : ti.state === "error"
            ? "failed"
            : "active";
      tools.push({
        id: ti.toolCallId || `${ti.toolName}-${Math.random()}`,
        name: ti.toolName,
        state,
        input: ti.args,
        output: ti.result,
        error: ti.result?.error,
      });
    }
  }

  return tools;
}

function getToolActionText(
  name: string,
  state: "active" | "done" | "failed",
  input?: Record<string, any>,
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
          {tool.output?.message && (
            <div className="text-foreground/80">
              {String(tool.output.message)}
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
  const [previewAvailable, setPreviewAvailable] = useState<boolean>(
    Boolean(sandboxId),
  );
  const autoTriggeredRef = useRef(false);

  useEffect(() => {
    if (sandboxId) {
      setPreviewAvailable(true);
    }
  }, [sandboxId]);

  const checkPreviewAvailability = useCallback(async () => {
    try {
      const res = await fetch(`/api/game/${id}/preview`, {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url || data.sandboxId) {
          setPreviewAvailable(true);
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
    if (!previewAvailable) {
      checkPreviewAvailability();
    }
  }, [previewAvailable, checkPreviewAvailability]);

  const cleanInitialMessages = sanitizeUIMessages(initialMessages);

  const {
    messages,
    setMessages,
    sendMessage,
    regenerate,
    status,
    stop,
    error,
  } = useChat({
    id,
    messages: cleanInitialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    onFinish: async ({ messages: finalMessages }) => {
      const clean = sanitizeUIMessages(finalMessages);
      if (clean.length > 0) {
        await setCachedMessages(id, clean);
        console.log(
          `[ChatThread] Cached ${clean.length} messages to IndexedDB for game ${id}`,
        );
      }
      checkPreviewAvailability();
      onTurnFinish?.();
    },
  });

  // Track status transitions to trigger onTurnFinish whenever streaming completes
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (
      (prevStatusRef.current === "streaming" ||
        prevStatusRef.current === "submitted") &&
      status === "ready"
    ) {
      onTurnFinish?.();
    }
    prevStatusRef.current = status;
  }, [status, onTurnFinish]);

  // Guarantee IndexedDB cache stays synced whenever generation completes or messages update
  useEffect(() => {
    if (status === "ready" && messages.length > 0) {
      const clean = sanitizeUIMessages(messages);
      if (clean.length > 0) {
        setCachedMessages(id, clean).catch((err) => {
          console.warn("[ChatThread] Failed to sync IndexedDB cache:", err);
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
        console.error("Auto-generate error:", err);
      });
    }
  }, [messages, selectedModel, regenerate]);

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
        console.error("Failed to load cached messages:", err);
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
                    const hasTools = toolCalls.length > 0;
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
                              {/* Tool Call States rendered with Marker */}
                              {hasTools && (
                                <div className="mb-2 space-y-1">
                                  {toolCalls.map((tool) => (
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
