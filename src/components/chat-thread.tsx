"use client";

import { useState, useEffect, useRef } from "react";
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
import { ChatComposer } from "@/components/chat-composer";
import { getCachedMessages, setCachedMessages } from "@/lib/cache/chat-cache";
import { DEFAULT_MODEL_ID } from "@/lib/ai/models";

interface ChatThreadProps {
  id: string;
  title?: string;
  initialMessages?: UIMessage[];
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

function sanitizeUIMessages(msgs: UIMessage[]): UIMessage[] {
  return (msgs ?? []).filter((m) => {
    if (m.role === "assistant") {
      return getMessageText(m).trim().length > 0;
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
}: ChatThreadProps) {
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL_ID);
  const autoTriggeredRef = useRef(false);

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
        console.log(`[ChatThread] Cached ${clean.length} messages to IndexedDB for game ${id}`);
      }
    },
  });

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
        if (cleanCached.length >= cleanInitialMessages.length && cleanCached.length > 0) {
          setMessages(cleanCached);
          return;
        }

        // 2. If browser cache is not available or outdated, use Neon DB data (initialMessages)
        if (cleanInitialMessages.length > 0) {
          setMessages(cleanInitialMessages);
          await setCachedMessages(id, cleanInitialMessages);
          return;
        }

        // 3. If neither has messages, query Neon DB API route to verify
        const res = await fetch(`/api/chat?id=${encodeURIComponent(id)}`);
        if (res.ok) {
          const data = await res.json();
          if (!isMounted) return;
          const neonMessages = sanitizeUIMessages((data.messages ?? []) as UIMessage[]);
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
  }, [id, initialMessages, setMessages]);

  const isLoading = status === "submitted" || status === "streaming";
  const displayMessages = messages.filter(
    (msg) => msg.role !== "assistant" || getMessageText(msg).trim().length > 0,
  );

  return (
    <MessageScrollerProvider>
      <MessageScroller className="h-full">
        <MessageScrollerViewport>
          <MessageScrollerContent className="mx-auto w-full max-w-2xl p-6">
            {displayMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                <p className="text-base font-medium text-foreground">
                  {title || "New Game"}
                </p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  No message history yet. Describe your ideas or ask questions
                  below to start designing your game.
                </p>
              </div>
            ) : (
              displayMessages.map((msg, i) => {
                const text = getMessageText(msg);
                const isAssistant = msg.role === "assistant";
                return (
                  <MessageScrollerItem key={msg.id ?? i}>
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
                        <MessageContent>
                          <Bubble variant="ghost">
                            <BubbleContent>{text}</BubbleContent>
                          </Bubble>
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
              displayMessages[displayMessages.length - 1]?.role === "user" && (
                <MessageScrollerItem key="ai-thinking">
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
        <MessageScrollerButton />
        <div className="mx-auto w-full max-w-2xl px-6 pb-6">
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
  );
}
