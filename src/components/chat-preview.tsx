"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { ExternalLink, Loader2, RefreshCw, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatPreviewProps {
  gameId: string;
  onClose?: () => void;
  revision?: number;
}

export function ChatPreview({ gameId, onClose, revision = 0 }: ChatPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameError, setGameError] = useState<string | null>(null);
  const [internalRevision, setInternalRevision] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastReportedErrorRef = useRef<string | null>(null);

  // Poll the game iframe with 'game-ping' to check health and capture runtime/syntax errors
  useEffect(() => {
    if (!previewUrl) {
      setGameError(null);
      lastReportedErrorRef.current = null;
      return;
    }

    const interval = setInterval(() => {
      try {
        iframeRef.current?.contentWindow?.postMessage("game-ping", "*");
      } catch {
        // ignore cross-origin access errors
      }
    }, 1000);

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "game-status") {
        if (event.data.error) {
          const msg =
            typeof event.data.error === "string"
              ? event.data.error
              : event.data.error.message || JSON.stringify(event.data.error);
          setGameError(msg);

          // Only log to Sentry when the error state changes to avoid log spam on 1s polling
          if (lastReportedErrorRef.current !== msg) {
            lastReportedErrorRef.current = msg;
            Sentry.logger.warn("Game runtime error reported from preview iframe", {
              game_id: gameId,
              error_message: msg,
              preview_url: previewUrl ?? "",
              revision,
              internal_revision: internalRevision,
            });
            Sentry.addBreadcrumb({
              category: "game.preview",
              message: `Game reported error: ${msg}`,
              level: "warning",
              data: { game_id: gameId, error: msg },
            });
          }
        } else {
          setGameError(null);
          // Log recovery if the game was previously reporting an error
          if (lastReportedErrorRef.current !== null) {
            lastReportedErrorRef.current = null;
            Sentry.logger.info("Game preview recovered and running healthy", {
              game_id: gameId,
              preview_url: previewUrl ?? "",
              revision,
              internal_revision: internalRevision,
            });
            Sentry.addBreadcrumb({
              category: "game.preview",
              message: "Game preview recovered and running healthy",
              level: "info",
              data: { game_id: gameId },
            });
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      clearInterval(interval);
      window.removeEventListener("message", handleMessage);
    };
  }, [previewUrl, revision, internalRevision, gameId]);

  const fetchPreviewUrl = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/game/${gameId}/preview`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.error || `Failed to start preview (Status ${res.status})`,
        );
      }
      const data = await res.json();
      if (!data.url) {
        throw new Error("No preview URL returned by server");
      }
      setPreviewUrl(data.url);
      Sentry.logger.info("Game preview URL loaded", {
        game_id: gameId,
        preview_url: data.url,
      });
      Sentry.addBreadcrumb({
        category: "game.preview",
        message: "Game preview URL loaded",
        level: "info",
        data: { game_id: gameId, preview_url: data.url },
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to load preview";
      Sentry.logger.error("Failed to load game preview URL", {
        game_id: gameId,
        error_message: errMsg,
      });
      Sentry.captureException(err, {
        tags: { game_id: gameId, component: "chat-preview" },
        extra: { gameId },
      });
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchPreviewUrl();
  }, [fetchPreviewUrl]);

  const handleReload = () => {
    const nextRevision = internalRevision + 1;
    setInternalRevision(nextRevision);
    Sentry.logger.info("Game preview reload requested by user", {
      game_id: gameId,
      revision,
      internal_revision: nextRevision,
    });
    Sentry.addBreadcrumb({
      category: "game.preview",
      message: "User reloaded game preview",
      level: "info",
      data: { game_id: gameId, revision, internal_revision: nextRevision },
    });
    if (!previewUrl) {
      fetchPreviewUrl();
    }
  };

  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden bg-background">
      {/* Header bar */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b px-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Preview</span>
        <div className="flex items-center gap-1">
          {previewUrl && (
            <>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleReload}
                title="Reload preview"
              >
                <RefreshCw className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  Sentry.addBreadcrumb({
                    category: "game.preview",
                    message: "Game preview opened in new tab",
                    level: "info",
                    data: { game_id: gameId, preview_url: previewUrl },
                  });
                  window.open(previewUrl, "_blank", "noopener,noreferrer");
                }}
                title="Open preview in new tab"
              >
                <ExternalLink className="size-3" />
              </Button>
            </>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                Sentry.addBreadcrumb({
                  category: "game.preview",
                  message: "Game preview closed",
                  level: "info",
                  data: { game_id: gameId },
                });
                onClose();
              }}
              title="Close preview"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Runtime/Syntax Error Notification from game-status */}
      {gameError && (
        <div className="flex shrink-0 items-center justify-between border-b border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          <div className="flex min-w-0 items-center gap-2">
            <AlertCircle className="size-3.5 shrink-0" />
            <span className="truncate font-mono">{gameError}</span>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/80 p-4">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Starting game server...
            </p>
          </div>
        )}

        {error ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4 text-center">
            <AlertCircle className="size-6 text-destructive" />
            <p className="max-w-xs text-xs text-muted-foreground">{error}</p>
            <Button variant="outline" size="xs" onClick={fetchPreviewUrl}>
              Retry
            </Button>
          </div>
        ) : previewUrl ? (
          <iframe
            ref={iframeRef}
            key={`${previewUrl}-${revision}-${internalRevision}`}
            src={previewUrl}
            title="Game Preview"
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        ) : null}
      </div>
    </div>
  );
}
