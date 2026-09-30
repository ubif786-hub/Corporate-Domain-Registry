const TWO_DP = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 32500, "usd" -> "$325.00 USD" */
export function money(cents: number, currency = "usd"): string {
  return "$" + TWO_DP.format(cents / 100) + " " + currency.toUpperCase();
}

/** 32500 -> "325.00", for the CSV (no thousands separator). */
export function plainAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** 5000 -> "5,000.00" */
export function twoDecimals(n: number): string {
  return TWO_DP.format(n);
}
