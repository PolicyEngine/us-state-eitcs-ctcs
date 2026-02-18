import type { CSSProperties } from "react";
import { formatValue } from "../utils";
import { METRICS } from "../types";
import type { ViewType } from "../types";

interface RegionData {
  cost: number;
  poverty_pct_cut: number;
  child_poverty_pct_cut: number;
}

interface DetailPanelProps {
  selectedRegion: { id: string | number; name: string } | null;
  regionData: RegionData | null;
  creditType: string;
  viewType: ViewType;
}

const styles: Record<string, CSSProperties> = {
  panel: {
    background: "var(--white)",
    borderRadius: 12,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    overflow: "hidden",
    position: "sticky",
    top: 24,
  },
  header: {
    background:
      "linear-gradient(135deg, var(--teal-700) 0%, var(--teal-800) 100%)",
    color: "white",
    padding: 24,
  },
  region: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 22,
    fontWeight: 600,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "var(--teal-200)",
  },
  empty: {
    padding: "60px 24px",
    textAlign: "center",
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.4,
  },
  emptyText: {
    color: "var(--slate-500)",
    fontSize: 14,
    lineHeight: 1.6,
  },
  metrics: {
    padding: "8px 0",
  },
  metricRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    borderBottom: "1px solid var(--slate-100)",
    transition: "background 0.15s ease",
  },
  metricRowLast: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    transition: "background 0.15s ease",
  },
  metricLabel: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    color: "var(--slate-500)",
    fontWeight: 500,
  },
  metricValue: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 18,
    fontWeight: 600,
    color: "var(--slate-800)",
  },
  metricValuePositive: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 18,
    fontWeight: 600,
    color: "var(--success)",
  },
};

export default function DetailPanel({
  selectedRegion,
  regionData,
  creditType,
  viewType,
}: DetailPanelProps) {
  if (!selectedRegion) {
    return (
      <div style={styles.panel}>
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>📍</div>
          <p style={styles.emptyText}>
            Select a {viewType === "state" ? "state" : "district"} on the map to
            explore detailed impact metrics
          </p>
        </div>
      </div>
    );
  }

  if (!regionData) {
    return (
      <div style={styles.panel}>
        <div style={styles.empty}>
          <p style={styles.emptyText}>No data available for this region</p>
        </div>
      </div>
    );
  }

  const hasNoProgram = Math.abs(regionData.cost || 0) < 0.01;

  if (hasNoProgram) {
    const creditDesc =
      creditType === "CTCs"
        ? "state Child Tax Credit"
        : creditType === "EITCs"
          ? "state Earned Income Tax Credit"
          : "state CTC or EITC";
    return (
      <div style={styles.panel}>
        <div style={styles.header}>
          <h2 style={styles.region}>{selectedRegion.name}</h2>
          <div style={styles.subtitle}>{creditType} Impact Analysis</div>
        </div>
        <div style={{ padding: "40px 24px", textAlign: "center" }}>
          <p style={{ color: "var(--slate-500)", fontSize: 15 }}>
            <strong>N/A</strong>
            <br />
            <br />
            This {viewType === "state" ? "state" : "district"} does not have a{" "}
            {creditDesc} program.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <h2 style={styles.region}>{selectedRegion.name}</h2>
        <div style={styles.subtitle}>{creditType} Impact Analysis</div>
      </div>
      <div style={styles.metrics}>
        {METRICS.map((m, i) => {
          const value = regionData[m.key as keyof RegionData];
          const isPositivePercent = m.format === "percent" && value > 0;
          return (
            <div
              key={m.key}
              style={
                i === METRICS.length - 1
                  ? styles.metricRowLast
                  : styles.metricRow
              }
            >
              <span style={styles.metricLabel}>{m.label}</span>
              <span
                style={
                  isPositivePercent
                    ? styles.metricValuePositive
                    : styles.metricValue
                }
              >
                {formatValue(value, m.format)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
