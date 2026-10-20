/**
 * Format credit amounts stored in billionths of a dollar (bigint).
 * 1 dollar = 1_000_000_000 (1 billion)
 */

export const BILLIONTHS_PER_DOLLAR = BigInt("1000000000");

/**
 * Formats an amount in billionths of a dollar to a standard USD currency string (e.g. "$10.00", "$1.00", "$8.80").
 * Handles positive and negative amounts, rounding to the nearest cent.
 */
export function formatDollars(amountInBillionths: bigint | number): string {
  const amount =
    typeof amountInBillionths === "bigint"
      ? amountInBillionths
      : BigInt(Math.round(amountInBillionths));

  const zero = BigInt(0);
  const isNegative = amount < zero;
  const absAmount = isNegative ? -amount : amount;

  const dollars = absAmount / BILLIONTHS_PER_DOLLAR;
  const remainder = absAmount % BILLIONTHS_PER_DOLLAR;

  // 1 cent = 10_000_000 billionths
  // Round to nearest cent: add half a cent (5_000_000) before integer division
  const halfCent = BigInt("5000000");
  const tenMillion = BigInt("10000000");
  let cents = Number((remainder + halfCent) / tenMillion);
  let totalDollars = dollars;

  if (cents >= 100) {
    totalDollars += BigInt(1);
    cents = 0;
  }

  const formattedCents = cents.toString().padStart(2, "0");
  const sign = isNegative ? "-" : "";

  return `${sign}$${totalDollars.toLocaleString("en-US")}.${formattedCents}`;
}

export const formatCredits = formatDollars;
export const formatAmount = formatDollars;
export default formatDollars;
