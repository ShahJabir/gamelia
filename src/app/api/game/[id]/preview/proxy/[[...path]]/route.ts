import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getGame } from "@/lib/games/queries";
import { getGamePreviewLink, startGameServer } from "@/lib/daytona/utils";

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; path?: string[] }> },
) {
  const { orgId, userId } = await auth();
  const effectiveOrgId = orgId || userId;
  if (!effectiveOrgId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id, path } = await params;
  const game = await getGame(id);

  if (!game || !game.sandboxId) {
    return new Response("Game sandbox not found", { status: 404 });
  }

  try {
    let previewInfo = await getGamePreviewLink(game.sandboxId, 8000);
    const subpath = path && path.length > 0 ? path.join("/") : "";
    const search = request.nextUrl.search;
    const targetUrl = new URL(
      subpath
        ? `${previewInfo.url}/${subpath}${search}`
        : `${previewInfo.url}/${search}`,
    );

    let upstreamRes = await fetch(targetUrl.toString(), {
      headers: {
        "x-daytona-preview-token": previewInfo.token,
        "X-Daytona-Skip-Preview-Warning": "true",
        Accept: request.headers.get("accept") || "*/*",
      },
      cache: "no-store",
    });

    // If unauthorized or token expired, force refresh the preview link and retry
    if (upstreamRes.status === 401 || upstreamRes.status === 403) {
      previewInfo = await getGamePreviewLink(game.sandboxId, 8000, true);
      upstreamRes = await fetch(targetUrl.toString(), {
        headers: {
          "x-daytona-preview-token": previewInfo.token,
          "X-Daytona-Skip-Preview-Warning": "true",
          Accept: request.headers.get("accept") || "*/*",
        },
        cache: "no-store",
      });
    }

    // If server was stopped or connection refused, try starting the server and retry once
    if (upstreamRes.status === 502 || upstreamRes.status === 504) {
      await startGameServer(game.sandboxId);
      previewInfo = await getGamePreviewLink(game.sandboxId, 8000, true);
      upstreamRes = await fetch(targetUrl.toString(), {
        headers: {
          "x-daytona-preview-token": previewInfo.token,
          "X-Daytona-Skip-Preview-Warning": "true",
          Accept: request.headers.get("accept") || "*/*",
        },
        cache: "no-store",
      });
    }

    const contentType =
      upstreamRes.headers.get("content-type") || "text/html; charset=utf-8";
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers,
    });
  } catch (err) {
    Sentry.logger.error("Error proxying preview request to game sandbox", {
      game_id: id,
      sandbox_id: game.sandboxId,
      subpath: path?.join("/") || "",
      error_message: err instanceof Error ? err.message : String(err),
    });
    Sentry.captureException(err, {
      tags: { game_id: id, route: "preview-proxy" },
      extra: { sandboxId: game.sandboxId, path },
    });
    return new Response("Error connecting to game preview", { status: 502 });
  }
}
