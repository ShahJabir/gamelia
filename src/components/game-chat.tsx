"use client";

import type { UIMessage } from "ai";
import { ChatThread } from "@/components/chat-thread";
import { ChatPreview } from "@/components/chat-preview";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export interface GameChatProps {
  id: string;
  title?: string;
  initialMessages?: UIMessage[];
  sandboxId?: string | null;
}

export function GameChat({
  id,
  title,
  initialMessages,
  sandboxId,
}: GameChatProps) {
  if (!sandboxId?.trim()) {
    return (
      <div className="h-full w-full">
        <ChatThread
          id={id}
          title={title}
          initialMessages={initialMessages}
        />
      </div>
    );
  }

  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
      <ResizablePanel defaultSize={50} minSize={30}>
        <ChatThread
          id={id}
          title={title}
          initialMessages={initialMessages}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50} minSize={30}>
        <ChatPreview gameId={id} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
