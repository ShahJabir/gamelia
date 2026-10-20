import { auth } from "@clerk/nextjs/server";
import { getOrgBalance, FREE_BASELINE_CREDITS } from "@/lib/credits/ledger";
import { formatDollars } from "@/lib/credits/format";

export async function GET() {
  const { orgId, userId } = await auth();
  const effectiveOrgId = orgId || userId;

  if (!effectiveOrgId) {
    return Response.json({
      credits: formatDollars(FREE_BASELINE_CREDITS),
      balance: FREE_BASELINE_CREDITS.toString(),
    });
  }

  const balance = await getOrgBalance(effectiveOrgId);

  return Response.json({
    credits: formatDollars(balance),
    balance: balance.toString(),
  });
}
