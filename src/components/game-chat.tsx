"use client";

import { useState } from "react";
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
  sandboxId: initialSandboxId,
}: GameChatProps) {
  const [activeSandboxId, setActiveSandboxId] = useState<string | null>(
    initialSandboxId?.trim() || null,
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(
    Boolean(initialSandboxId?.trim()),
  );

  const [previewRevision, setPreviewRevision] = useState<number>(0);

  const handleOpenPreview = () => {
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
  };

  const handlePreviewAvailable = (newSandboxId: string) => {
    setActiveSandboxId(newSandboxId);
  };

  const handleTurnFinish = () => {
    setPreviewRevision((prev) => prev + 1);
  };

  return (
    <div className="h-full w-full min-h-0 overflow-hidden">
      {!isPreviewOpen || !activeSandboxId ? (
        <ChatThread
          id={id}
          title={title}
          initialMessages={initialMessages}
          sandboxId={activeSandboxId}
          isPreviewOpen={false}
          onOpenPreview={handleOpenPreview}
          onPreviewAvailable={handlePreviewAvailable}
          onTurnFinish={handleTurnFinish}
        />
      ) : (
        <ResizablePanelGroup
          orientation="horizontal"
          className="h-full w-full min-h-0 overflow-hidden"
        >
          <ResizablePanel
            defaultSize={50}
            minSize={30}
            className="h-full min-h-0 overflow-hidden"
          >
            <ChatThread
              id={id}
              title={title}
              initialMessages={initialMessages}
              sandboxId={activeSandboxId}
              isPreviewOpen={true}
              onOpenPreview={handleOpenPreview}
              onClosePreview={handleClosePreview}
              onPreviewAvailable={handlePreviewAvailable}
              onTurnFinish={handleTurnFinish}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel
            defaultSize={50}
            minSize={30}
            className="h-full min-h-0 overflow-hidden"
          >
            <ChatPreview
              gameId={id}
              onClose={handleClosePreview}
              revision={previewRevision}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
}
