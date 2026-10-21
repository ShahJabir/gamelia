import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getGame } from "@/lib/games/queries";
import { startGameServer, getGameSandbox } from "@/lib/daytona/utils";

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

  let sandboxId = game.sandboxId;

  if (!sandboxId) {
    try {
      const { sandbox } = await getGameSandbox(id);
      sandboxId = sandbox.id;
    } catch (createErr) {
      return NextResponse.json(
        { error: "Game sandbox is still initializing", ready: false },
        { status: 202 },
      );
    }
  }

  if (!sandboxId) {
    return NextResponse.json(
      { error: "Game sandbox is still initializing", ready: false },
      { status: 202 },
    );
  }

  try {
    // Ensures the HTTP server is started and healthy, returns { sandbox }
    const { sandbox } = await startGameServer(sandboxId);

    // Mint the preview URL directly from the returned sandbox
    const preview = await sandbox.getSignedPreviewUrl(8000, 3600);

    Sentry.logger.info("Minted game preview URL", {
      game_id: id,
      sandbox_id: sandboxId,
      preview_url: preview.url,
    });

    return NextResponse.json({
      url: preview.url,
      sandboxId,
    });
  } catch (error) {
    const errorMsg =
      error instanceof Error
        ? error.message
        : "Failed to initialize game server";
    Sentry.logger.error("Failed to start game server for preview", {
      game_id: id,
      sandbox_id: sandboxId,
      error_message: errorMsg,
    });
    Sentry.captureException(error, {
      tags: { game_id: id, route: "/api/game/[id]/preview" },
      extra: { sandboxId },
    });
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 },
    );
  }
}
