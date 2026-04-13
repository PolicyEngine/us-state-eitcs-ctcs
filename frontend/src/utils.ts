export function formatValue(
  value: number | null | undefined,
  format: "currency" | "percent",
): string {
  if (value === null || value === undefined || isNaN(value)) return "N/A";
  if (format === "currency") {
    const absValue = Math.abs(value);
    if (absValue >= 1e9) return "$" + (value / 1e9).toFixed(2) + "B";
    if (absValue >= 1e6) return "$" + (value / 1e6).toFixed(1) + "M";
    if (absValue >= 1e3) return "$" + (value / 1e3).toFixed(1) + "K";
    return "$" + value.toFixed(0);
  }
  return (value * 100).toFixed(2) + "%";
}
