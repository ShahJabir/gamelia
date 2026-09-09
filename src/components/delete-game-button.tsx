"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteGameAction } from "@/lib/games/action";
import { clearCachedMessages } from "@/lib/cache/chat-cache";
import { cn } from "@/lib/utils";

interface DeleteGameButtonProps {
  gameId: string;
  gameTitle?: string;
  variant?: "header" | "sidebar";
  className?: string;
}

export function DeleteGameButton({
  gameId,
  gameTitle,
  variant = "header",
  className,
}: DeleteGameButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        // 1. Purge from browser IndexedDB cache
        await clearCachedMessages(gameId);

        // 2. Delete from Neon DB via Server Action
        await deleteGameAction(gameId);

        setOpen(false);

        // 3. Navigate back to home page
        router.push("/");
        router.refresh();
      } catch (err) {
        console.error("Failed to delete game:", err);
      }
    });
  };

  const titleText = gameTitle || "this chat";

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          variant === "header" ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={cn(
                "size-8 rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer",
                className,
              )}
              title="Delete chat"
            >
              <Trash2Icon className="size-4" />
            </Button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(true);
              }}
              className={cn(
                "flex size-6 items-center justify-center rounded-md text-muted-foreground/60 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover/item:opacity-100 cursor-pointer",
                className,
              )}
              title="Delete chat"
            >
              <Trash2Icon className="size-3.5" />
            </button>
          )
        }
      />
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete game chat?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <span className="font-semibold text-foreground">&quot;{titleText}&quot;</span>? This will permanently remove all messages from the database and cache.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <>
                <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
