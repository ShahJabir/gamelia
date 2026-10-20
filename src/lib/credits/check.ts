import * as Sentry from "@sentry/nextjs";
import { getOrgBalance } from "./ledger";
import { reconcileOrgSubscriptionCredits } from "./reconcile";

export const OUT_OF_CREDITS_MESSAGE =
  "You're out of credits. Please visit the Billing page to upgrade your plan or add more credits to continue building.";

export interface CheckOrgCreditsResult {
  hasCredits: boolean;
  balance: bigint;
}

/**
 * Checks if an organization has sufficient credits before starting a session or turn.
 * - If the balance is empty (<= 0), syncs the subscription once first via Clerk billing API (a month may have renewed).
 * - Re-evaluates balance after syncing.
 * - Returns { hasCredits: boolean, balance: bigint }
 *
 * @param orgId The Clerk organization ID or user ID
 */
export async function checkOrgCredits(
  orgId: string,
): Promise<CheckOrgCreditsResult> {
  const zero = BigInt(0);

  if (!orgId) {
    return { hasCredits: false, balance: zero };
  }

  let balance = await getOrgBalance(orgId);

  // If the balance is empty, sync the subscription once first - a month may have renewed
  if (balance <= zero) {
    Sentry.logger.info(
      "Org credit balance is empty, syncing subscription once first",
      {
        org_id: orgId,
        initial_balance: balance.toString(),
      },
    );

    try {
      await reconcileOrgSubscriptionCredits(orgId);
      balance = await getOrgBalance(orgId);
    } catch (err) {
      Sentry.logger.warn("Failed to reconcile subscription during credit check", {
        org_id: orgId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const hasCredits = balance > zero;

  return { hasCredits, balance };
}
