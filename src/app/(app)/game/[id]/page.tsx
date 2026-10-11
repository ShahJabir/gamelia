import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { GameChat } from "@/components/game-chat";
import { getGame } from "@/lib/games/queries";
import type { UIMessage } from "ai";

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await auth.protect();
  const { id } = await params;

  const game = await getGame(id);

  if (!game) {
    notFound();
  }

  const initialMessages = (game.messages ?? []) as UIMessage[];

  return (
    <GameChat
      id={game.id}
      title={game.title}
      initialMessages={initialMessages}
      sandboxId={game.sandboxId}
    />
  );
}

