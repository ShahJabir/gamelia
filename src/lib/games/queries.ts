import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import type { UIMessage } from "ai";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";

export async function listGames() {
  const { orgId, userId } = await auth();
  const effectiveOrgId = orgId || userId;

  if (!effectiveOrgId) {
    return [];
  }

  return db
    .select()
    .from(games)
    .where(eq(games.orgId, effectiveOrgId))
    .orderBy(desc(games.createdAt));
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getGame(gameId: string, orgId?: string) {
  const { orgId: clerkOrgId, userId } = await auth();
  const effectiveOrgId = orgId ?? (clerkOrgId || userId);

  if (!effectiveOrgId || !UUID_REGEX.test(gameId)) {
    return null;
  }

  const [game] = await db
    .select()
    .from(games)
    .where(and(eq(games.id, gameId), eq(games.orgId, effectiveOrgId)))
    .limit(1);

  return game ?? null;
}

export async function getGameMessages(gameId: string): Promise<UIMessage[] | null> {
  const { orgId, userId } = await auth();
  const effectiveOrgId = orgId || userId;

  if (!effectiveOrgId || !UUID_REGEX.test(gameId)) {
    return null;
  }

  const [game] = await db
    .select({ messages: games.messages })
    .from(games)
    .where(and(eq(games.id, gameId), eq(games.orgId, effectiveOrgId)))
    .limit(1);

  if (!game) {
    return null;
  }

  return (game.messages ?? []) as UIMessage[];
}

export async function saveGameMessages(
  gameId: string,
  orgId: string,
  messages: UIMessage[],
) {
  await db
    .update(games)
    .set({ messages })
    .where(and(eq(games.id, gameId), eq(games.orgId, orgId)));
}

export async function deleteGame(gameId: string, orgId?: string): Promise<boolean> {
  const { orgId: clerkOrgId, userId } = await auth();
  const effectiveOrgId = orgId ?? (clerkOrgId || userId);

  if (!effectiveOrgId || !UUID_REGEX.test(gameId)) {
    return false;
  }

  const result = await db
    .delete(games)
    .where(and(eq(games.id, gameId), eq(games.orgId, effectiveOrgId)))
    .returning({ id: games.id });

  return result.length > 0;
}

