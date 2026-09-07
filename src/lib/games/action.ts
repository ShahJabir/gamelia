"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";

export async function createGame(formData: FormData) {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Organization is required");
  }

  const title = formData.get("title") as string;

  if (!title?.trim()) {
    throw new Error("Title is required");
  }

  const [game] = await db
    .insert(games)
    .values({
      orgId,
      title: title.trim(),
    })
    .returning();

  redirect(`/games/${game.id}`);
}
