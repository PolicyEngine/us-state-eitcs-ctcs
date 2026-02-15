import type { MetricKey } from "./types";

export function formatMetricValue(value: number, metric: MetricKey): string {
  if (metric === "cost") {
    if (value === 0) return "$0";
    const absValue = Math.abs(value);
    if (absValue >= 1e9) {
      return `${value < 0 ? "-" : ""}$${(absValue / 1e9).toFixed(1)}B`;
    }
    if (absValue >= 1e6) {
      return `${value < 0 ? "-" : ""}$${(absValue / 1e6).toFixed(1)}M`;
    }
    return `${value < 0 ? "-" : ""}$${absValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  return `${(value * 100).toFixed(2)}%`;
}
