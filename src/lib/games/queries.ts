import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";

export async function listGames() {
  const { orgId } = await auth();

  if (!orgId) {
    return [];
  }

  return db
    .select()
    .from(games)
    .where(eq(games.orgId, orgId))
    .orderBy(desc(games.createdAt));
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getGame(gameId: string) {
  const { orgId } = await auth();

  if (!orgId || !UUID_REGEX.test(gameId)) {
    return null;
  }

  const [game] = await db
    .select()
    .from(games)
    .where(and(eq(games.id, gameId), eq(games.orgId, orgId)))
    .limit(1);

  return game ?? null;
}

export async function getGameMessages(gameId: string) {
  const { orgId } = await auth();

  if (!orgId || !UUID_REGEX.test(gameId)) {
    return null;
  }

  const [game] = await db
    .select({ messages: games.messages })
    .from(games)
    .where(and(eq(games.id, gameId), eq(games.orgId, orgId)))
    .limit(1);

  if (!game) {
    return null;
  }

  return (game.messages ?? []) as unknown[];
}

export async function saveGameMessages(
  gameId: string,
  orgId: string,
  messages: unknown[],
) {
  await db
    .update(games)
    .set({ messages })
    .where(and(eq(games.id, gameId), eq(games.orgId, orgId)));
}

