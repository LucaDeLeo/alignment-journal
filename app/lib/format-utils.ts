/** Format a numeric amount as USD currency (e.g., 1500 -> "$1,500"). */
export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString()}`
}
