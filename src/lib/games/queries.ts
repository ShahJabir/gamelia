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

export async function getGameOrgId(gameId: string): Promise<string | null> {
  if (!UUID_REGEX.test(gameId)) {
    return null;
  }

  const [game] = await db
    .select({ orgId: games.orgId })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);

  return game?.orgId ?? null;
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

export async function renameGame(
  gameId: string,
  newTitle: string,
  orgId?: string,
): Promise<boolean> {
  const { orgId: clerkOrgId, userId } = await auth();
  const effectiveOrgId = orgId ?? (clerkOrgId || userId);
  const trimmed = newTitle.trim();

  if (!effectiveOrgId || !UUID_REGEX.test(gameId) || !trimmed) {
    return false;
  }

  const result = await db
    .update(games)
    .set({ title: trimmed })
    .where(and(eq(games.id, gameId), eq(games.orgId, effectiveOrgId)))
    .returning({ id: games.id, title: games.title });

  return result.length > 0;
}

export async function deleteGame(gameId: string, orgId?: string): Promise<boolean> {
  const { orgId: clerkOrgId, userId } = await auth();
  const effectiveOrgId = orgId ?? (clerkOrgId || userId);

  if (!effectiveOrgId || !UUID_REGEX.test(gameId)) {
    return false;
  }

  // 1. Fetch game to find associated sandboxId before removing the row
  const [game] = await db
    .select({ id: games.id, sandboxId: games.sandboxId })
    .from(games)
    .where(and(eq(games.id, gameId), eq(games.orgId, effectiveOrgId)))
    .limit(1);

  if (!game) {
    return false;
  }

  // 2. Permanently delete the Daytona sandbox to prevent stray sandboxes
  if (game.sandboxId) {
    const { deleteGameSandbox } = await import("@/lib/daytona/utils");
    await deleteGameSandbox(game.sandboxId).catch(() => {});
  }

  // 3. Delete from Neon DB
  const result = await db
    .delete(games)
    .where(and(eq(games.id, gameId), eq(games.orgId, effectiveOrgId)))
    .returning({ id: games.id });

  return result.length > 0;
}

