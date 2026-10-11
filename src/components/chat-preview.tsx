"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [internalRevision, setInternalRevision] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
    } catch (err) {
      console.error("[ChatPreview] Error fetching preview URL:", err);
      setError(err instanceof Error ? err.message : "Failed to load preview");
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchPreviewUrl();
  }, [fetchPreviewUrl]);

  const handleReload = () => {
    setInternalRevision((prev) => prev + 1);
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
                onClick={() =>
                  window.open(previewUrl, "_blank", "noopener,noreferrer")
                }
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
              onClick={onClose}
              title="Close preview"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

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
