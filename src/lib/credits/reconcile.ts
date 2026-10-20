import { clerkClient } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db";
import { creditLedger } from "@/lib/db/schema";

/**
 * Monthly subscription credit grant: +$10.00 in billionths of a dollar.
 * 1 dollar = 1_000_000_000 billionths
 * 10 dollars = 10_000_000_000 billionths
 */
export const MONTHLY_SUBSCRIPTION_CREDITS = BigInt("10000000000");

/**
 * Generates month keys (e.g. ["2026-08", "2026-09", "2026-10"]) for all paid periods
 * between creation date and the current period start.
 */
function getPaidMonths(
  createdAtRaw: number,
  periodStartRaw: number,
  status: string,
  pastDueAtRaw: number | null,
): string[] {
  // Normalize timestamps (convert seconds to milliseconds if needed)
  const startMs = createdAtRaw < 1e11 ? createdAtRaw * 1000 : createdAtRaw;
  let endMs = periodStartRaw < 1e11 ? periodStartRaw * 1000 : periodStartRaw;

  // If status is past_due and pastDueAt is set, do not credit past-due period
  if (status === "past_due" && pastDueAtRaw) {
    const pastDueMs =
      pastDueAtRaw < 1e11 ? pastDueAtRaw * 1000 : pastDueAtRaw;
    endMs = Math.min(endMs, pastDueMs - 1);
  }

  const startDate = new Date(startMs);
  const endDate = new Date(endMs);

  if (endDate < startDate) {
    return [];
  }

  const months: string[] = [];
  const current = new Date(
    Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1),
  );
  const last = new Date(
    Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1),
  );

  while (current <= last) {
    const yyyy = current.getUTCFullYear();
    const mm = String(current.getUTCMonth() + 1).padStart(2, "0");
    months.push(`${yyyy}-${mm}`);
    current.setUTCMonth(current.getUTCMonth() + 1);
  }

  return months;
}

/**
 * Reconciles organization credits with Clerk billing subscription.
 * - Reads subscription via getOrganizationBillingSubscription
 * - Inserts a credit_ledger row of +$10 (10_000_000_000n) per month paid for
 * - Never grants the same month twice (enforced by UNIQUE(org_id, entry_key) and onConflictDoNothing)
 *
 * @param orgId The Clerk organization ID
 */
export async function reconcileOrgSubscriptionCredits(
  orgId: string,
): Promise<void> {
  if (!orgId) return;

  try {
    const client = await clerkClient();
    const subscription =
      await client.billing.getOrganizationBillingSubscription(orgId);

    if (!subscription?.subscriptionItems?.length) {
      return;
    }

    // Inspect items to find paid recurring plans
    for (const item of subscription.subscriptionItems) {
      const isPaidPlan =
        !item.isFreeTrial &&
        (item.plan?.slug === "builder" ||
          (item.plan?.fee?.amount ?? 0) > 0 ||
          (item.amount?.amount ?? 0) > 0);

      if (!isPaidPlan) {
        continue;
      }

      // Collect all paid months for this subscription item
      const paidMonths = getPaidMonths(
        item.createdAt,
        item.periodStart,
        item.status,
        item.pastDueAt ?? null,
      );

      for (const monthKey of paidMonths) {
        const entryKey = `sub_month:${monthKey}`;

        // Insert +$10 per month paid for; never grant the same month twice
        await db
          .insert(creditLedger)
          .values({
            orgId,
            entryKey,
            amount: MONTHLY_SUBSCRIPTION_CREDITS,
          })
          .onConflictDoNothing();
      }

      Sentry.logger.info("Reconciled subscription credits for organization", {
        org_id: orgId,
        subscription_id: subscription.id,
        plan: item.plan?.slug,
        paid_months_count: paidMonths.length,
      });
    }
  } catch (error) {
    Sentry.logger.error("Failed to reconcile organization subscription credits", {
      org_id: orgId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export const reconcileCredits = reconcileOrgSubscriptionCredits;
export const reconcile = reconcileOrgSubscriptionCredits;
export default reconcileOrgSubscriptionCredits;
