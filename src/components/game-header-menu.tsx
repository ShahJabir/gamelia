"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { renameGameAction, deleteGameAction } from "@/lib/games/action";
import { clearCachedMessages } from "@/lib/cache/chat-cache";
import { cn } from "@/lib/utils";

export interface GameOptionsMenuProps {
  gameId: string;
  gameTitle?: string;
  onTitleChange?: (newTitle: string) => void;
  variant?: "header" | "sidebar";
  className?: string;
}

export function GameOptionsMenu({
  gameId,
  gameTitle,
  onTitleChange,
  variant = "header",
  className,
}: GameOptionsMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [titleInput, setTitleInput] = useState(gameTitle || "");
  const [isRenaming, startRenameTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const handleOpenRename = () => {
    setTitleInput(gameTitle || "");
    setIsRenameOpen(true);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = titleInput.trim();
    if (!trimmed || trimmed === gameTitle) {
      setIsRenameOpen(false);
      return;
    }

    startRenameTransition(async () => {
      try {
        const success = await renameGameAction(gameId, trimmed);
        if (success) {
          onTitleChange?.(trimmed);
          setIsRenameOpen(false);
          router.refresh();
          Sentry.logger.info("Game renamed successfully", {
            game_id: gameId,
            new_title: trimmed,
          });
          Sentry.addBreadcrumb({
            category: "game",
            message: `Renamed game to "${trimmed}"`,
            level: "info",
            data: { game_id: gameId, new_title: trimmed },
          });
        }
      } catch (err) {
        Sentry.logger.error("Failed to rename game", {
          game_id: gameId,
          error: err instanceof Error ? err.message : String(err),
        });
        Sentry.captureException(err, {
          tags: { component: "game-options-menu", action: "rename", game_id: gameId },
        });
      }
    });
  };

  const handleDelete = () => {
    startDeleteTransition(async () => {
      try {
        // 1. Purge from browser IndexedDB cache
        await clearCachedMessages(gameId);

        // 2. Delete from Neon DB and remove Daytona sandbox
        await deleteGameAction(gameId);

        Sentry.logger.info("Deleted game and sandbox successfully", {
          game_id: gameId,
          title: gameTitle || "untitled",
        });
        Sentry.addBreadcrumb({
          category: "game",
          message: "Deleted game and sandbox",
          level: "info",
          data: { game_id: gameId },
        });

        setIsTrashOpen(false);

        // 3. Navigate back to home page if currently viewing this game
        if (pathname === `/game/${gameId}`) {
          router.push("/");
        }
        router.refresh();
      } catch (err) {
        Sentry.logger.error("Failed to delete game", {
          game_id: gameId,
          error_message: err instanceof Error ? err.message : String(err),
        });
        Sentry.captureException(err, {
          tags: { component: "game-options-menu", action: "delete", game_id: gameId },
        });
      }
    });
  };

  const currentTitle = gameTitle || "this chat";

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          render={
            variant === "sidebar" ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className={cn(
                  "flex size-6 items-center justify-center rounded-md text-muted-foreground/60 transition-opacity hover:bg-accent hover:text-foreground group-hover/item:opacity-100 cursor-pointer",
                  menuOpen ? "opacity-100 bg-accent text-foreground" : "opacity-0",
                  className,
                )}
                title="Game options"
              >
                <MoreHorizontal className="size-3.5" />
                <span className="sr-only">Game options</span>
              </button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className={cn(
                  "size-8 rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer",
                  menuOpen && "bg-accent text-foreground",
                  className,
                )}
                title="Game options"
              >
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Game options</span>
              </Button>
            )
          }
        />
        <DropdownMenuContent
          align="end"
          side="bottom"
          sideOffset={6}
          className="w-36"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleOpenRename();
            }}
            className="cursor-pointer gap-2"
          >
            <Pencil className="size-3.5" />
            <span>Rename</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              setIsTrashOpen(true);
            }}
            className="cursor-pointer gap-2"
          >
            <Trash2 className="size-3.5" />
            <span>Trash</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleRenameSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Rename Game</DialogTitle>
              <DialogDescription>
                Enter a new title for this game.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor={`rename-game-title-${gameId}`}>Title</Label>
              <Input
                id={`rename-game-title-${gameId}`}
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="Game title"
                disabled={isRenaming}
                autoFocus
                maxLength={100}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRenameOpen(false)}
                disabled={isRenaming}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isRenaming || !titleInput.trim() || titleInput.trim() === gameTitle}
              >
                {isRenaming ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Trash / Delete Confirmation Alert Dialog */}
      <AlertDialog open={isTrashOpen} onOpenChange={setIsTrashOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete game chat?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">&quot;{currentTitle}&quot;</span>? This will permanently delete the game, its messages, and its Daytona sandbox.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Export GameHeaderMenu as alias for backwards compatibility
export const GameHeaderMenu = GameOptionsMenu;
export type GameHeaderMenuProps = GameOptionsMenuProps;
