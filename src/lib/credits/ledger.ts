import { db } from "@/lib/db";
import { creditLedger } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Free baseline credit granted to every organization without creating a ledger row.
 * 1 dollar = 1_000_000_000 billionths
 */
export const FREE_BASELINE_CREDITS = BigInt("1000000000");

/**
 * Calculates the current credit balance for an organization in billionths of a dollar.
 * Balance = sum of an organization's credit_ledger rows + $1.00 free baseline (not stored as a row).
 * An organization with no rows will read exactly $1.00 (1_000_000_000n).
 *
 * @param orgId The Clerk organization ID
 * @returns Balance in billionths of a dollar (bigint)
 */
export async function getOrgBalance(orgId: string): Promise<bigint> {
  if (!orgId) {
    return FREE_BASELINE_CREDITS;
  }

  const [result] = await db
    .select({
      total: sql<string>`coalesce(sum(${creditLedger.amount}), '0')`,
    })
    .from(creditLedger)
    .where(eq(creditLedger.orgId, orgId));

  const rowsSum = BigInt(result?.total ?? "0");
  return rowsSum + FREE_BASELINE_CREDITS;
}

/**
 * Charges an organization for an AI generation step.
 * Inserts a negative credit_ledger row for the specified amount.
 * Uses the step's response ID as the entry key ("step:<responseId>")
 * so the step can never be charged twice (enforced by UNIQUE(org_id, entry_key) and onConflictDoNothing).
 *
 * @param orgId The organization ID to charge
 * @param responseId The step response ID (from step.response.id)
 * @param amount The cost in billionths of a dollar (bigint or number)
 */
export async function chargeStep(
  orgId: string,
  responseId: string,
  amount: bigint | number,
): Promise<void> {
  if (!orgId || !responseId) {
    return;
  }

  const rawAmount =
    typeof amount === "bigint" ? amount : BigInt(Math.round(amount));

  const zero = BigInt(0);
  // Ensure the amount stored in the ledger row is negative
  const negativeAmount =
    rawAmount > zero ? -rawAmount : rawAmount < zero ? rawAmount : zero;

  await db
    .insert(creditLedger)
    .values({
      orgId,
      entryKey: `step:${responseId}`,
      amount: negativeAmount,
    })
    .onConflictDoNothing();
}

export const getBalance = getOrgBalance;
export default getOrgBalance;
