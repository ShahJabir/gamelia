import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getGame } from "@/lib/games/queries";
import { startGameServer } from "@/lib/daytona/utils";

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { orgId, userId } = await auth();
  const effectiveOrgId = orgId || userId;
  if (!effectiveOrgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const game = await getGame(id);

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  if (!game.sandboxId) {
    return NextResponse.json(
      { error: "Game does not have an associated sandbox" },
      { status: 400 },
    );
  }

  try {
    // Ensures the HTTP server is started and healthy, returns { sandbox }
    const { sandbox } = await startGameServer(game.sandboxId);

    // Mint the preview URL directly from the returned sandbox
    const preview = await sandbox.getSignedPreviewUrl(8000, 3600);

    return NextResponse.json({
      url: preview.url,
      sandboxId: game.sandboxId,
    });
  } catch (error) {
    console.error(
      `[preview API] Failed to start game server for game ${id}:`,
      error,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to initialize game server",
      },
      { status: 500 },
    );
  }
}
