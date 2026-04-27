import type { CSSProperties } from "react";
import { formatValue } from "../utils";

interface StatsBannerProps {
  totalCost: number;
  povertyReduction: number;
  childPovertyReduction: number;
}

const styles: Record<string, CSSProperties> = {
  banner: {
    maxWidth: 1200,
    margin: "-48px auto 0",
    padding: "0 32px",
    position: "relative",
    zIndex: 10,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    background: "var(--white)",
    borderRadius: 12,
    boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
    overflow: "hidden",
    animation: "fadeInUp 0.5s ease-out 0.1s both",
  },
  item: {
    padding: "28px 24px",
    textAlign: "center",
    borderRight: "1px solid var(--slate-100)",
    position: "relative",
    transition: "background 0.2s ease",
  },
  itemLast: {
    padding: "28px 24px",
    textAlign: "center",
    position: "relative",
    transition: "background 0.2s ease",
  },
  eyebrow: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "var(--teal-700)",
    marginBottom: 8,
  },
  number: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 38,
    fontWeight: 600,
    color: "var(--slate-900)",
    lineHeight: 1,
    marginBottom: 6,
  },
  context: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    color: "var(--slate-500)",
  },
};

export default function StatsBanner({
  totalCost,
  povertyReduction,
  childPovertyReduction,
}: StatsBannerProps) {
  const stats = [
    {
      eyebrow: "Total Investment",
      value: formatValue(totalCost, "currency"),
      context: "across all states",
    },
    {
      eyebrow: "Poverty Reduction",
      value: formatValue(povertyReduction, "percent"),
      context: "national decrease",
    },
    {
      eyebrow: "Child Poverty Reduction",
      value: formatValue(childPovertyReduction, "percent"),
      context: "national decrease",
    },
  ];

  return (
    <section style={styles.banner} aria-label="National statistics">
      <h2 className="sr-only">National Statistics</h2>
      <div style={styles.grid} className="stats-grid">
        {stats.map((s, i) => (
          <div
            key={s.eyebrow}
            style={i === stats.length - 1 ? styles.itemLast : styles.item}
            className="stat-item"
          >
            <div style={styles.eyebrow}>{s.eyebrow}</div>
            <div style={styles.number}>{s.value}</div>
            <div style={styles.context}>{s.context}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
