import type { CSSProperties } from "react";
import PillGroup from "./PillGroup";
import type { MetricKey, ViewType, SupportedYear } from "../types";
import { METRICS, SUPPORTED_YEARS } from "../types";

interface ControlBarProps {
  year: SupportedYear;
  onYearChange: (y: SupportedYear) => void;
  viewType: ViewType;
  onViewTypeChange: (v: ViewType) => void;
  creditType: string;
  onCreditTypeChange: (c: string) => void;
  metric: MetricKey;
  onMetricChange: (m: MetricKey) => void;
}

const styles: Record<string, CSSProperties> = {
  bar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 24,
    padding: "20px 24px",
    background: "var(--white)",
    borderRadius: 12,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    marginBottom: 24,
    animation: "fadeInUp 0.5s ease-out 0.2s both",
  },
  section: {
    display: "flex",
    alignItems: "center",
    gap: 28,
    flexWrap: "wrap",
  },
  group: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  label: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "var(--slate-500)",
  },
  dropdown: {
    appearance: "none" as const,
    background:
      "var(--slate-50) url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748B' d='M6 8L2 4h8z'/%3E%3C/svg%3E\") no-repeat right 14px center",
    border: "1px solid var(--slate-200)",
    borderRadius: 8,
    padding: "10px 40px 10px 16px",
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    fontWeight: 500,
    color: "var(--slate-700)",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
};

export default function ControlBar({
  year,
  onYearChange,
  viewType,
  onViewTypeChange,
  creditType,
  onCreditTypeChange,
  metric,
  onMetricChange,
}: ControlBarProps) {
  return (
    <div style={styles.bar}>
      <div style={styles.section}>
        <div style={styles.group}>
          <span style={styles.label}>Year</span>
          <PillGroup
            options={SUPPORTED_YEARS.map((y) => ({
              label: String(y),
              value: String(y),
            }))}
            value={String(year)}
            onChange={(v) => onYearChange(Number(v) as SupportedYear)}
            ariaLabel="Year"
          />
        </div>
        <div style={styles.group}>
          <span style={styles.label}>View</span>
          <PillGroup
            options={[
              { label: "States", value: "state" },
              { label: "Districts", value: "district" },
            ]}
            value={viewType}
            onChange={(v) => onViewTypeChange(v as ViewType)}
            ariaLabel="View type"
          />
        </div>
        <div style={styles.group}>
          <span style={styles.label}>Credit Type</span>
          <PillGroup
            options={[
              { label: "CTC", value: "CTCs" },
              { label: "EITC", value: "EITCs" },
              { label: "Both", value: "CTCs and EITCs" },
            ]}
            value={creditType}
            onChange={onCreditTypeChange}
            ariaLabel="Credit type"
          />
        </div>
      </div>
      <div style={styles.group}>
        <span style={styles.label}>Metric</span>
        <select
          style={styles.dropdown}
          value={metric}
          onChange={(e) => onMetricChange(e.target.value as MetricKey)}
          aria-label="Metric"
        >
          {METRICS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
