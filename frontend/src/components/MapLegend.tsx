import type { CSSProperties } from "react";

interface MapLegendProps {
  title: string;
  maxLabel: string;
  minLabel: string;
}

const styles: Record<string, CSSProperties> = {
  legend: {
    position: "absolute",
    bottom: 16,
    right: 16,
    background: "var(--white)",
    borderRadius: 10,
    padding: "14px 16px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
    minWidth: 130,
    zIndex: 10,
  },
  title: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "var(--slate-500)",
    marginBottom: 12,
  },
  scale: {
    display: "flex",
    gap: 10,
  },
  gradient: {
    width: 14,
    height: 90,
    borderRadius: 4,
    background:
      "linear-gradient(to bottom, var(--teal-900), var(--teal-700), var(--teal-500), var(--teal-400), var(--teal-200), var(--teal-50))",
  },
  labels: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    fontFamily: "'Inter', sans-serif",
    fontSize: 11,
    fontWeight: 500,
    color: "var(--slate-600)",
  },
  zero: {
    marginTop: 12,
    paddingTop: 10,
    borderTop: "1px solid var(--slate-100)",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  zeroSwatch: {
    width: 14,
    height: 10,
    background: "var(--slate-300)",
    borderRadius: 3,
  },
  zeroText: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 11,
    color: "var(--slate-500)",
  },
};

export default function MapLegend({ title, maxLabel, minLabel }: MapLegendProps) {
  return (
    <div style={styles.legend}>
      <div style={styles.title}>{title}</div>
      <div style={styles.scale}>
        <div style={styles.gradient} />
        <div style={styles.labels}>
          <span>{maxLabel}</span>
          <span>{minLabel}</span>
        </div>
      </div>
      <div style={styles.zero}>
        <div style={styles.zeroSwatch} />
        <span style={styles.zeroText}>No program</span>
      </div>
    </div>
  );
}
