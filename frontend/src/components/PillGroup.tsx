import type { CSSProperties } from "react";

interface PillGroupProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}

const styles: Record<string, CSSProperties> = {
  group: {
    display: "flex",
    background: "var(--slate-100)",
    borderRadius: 8,
    padding: 4,
    gap: 2,
  },
  btn: {
    padding: "8px 16px",
    border: "none",
    background: "transparent",
    color: "var(--slate-600)",
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    borderRadius: 6,
    transition: "all 0.2s ease",
  },
  btnActive: {
    padding: "8px 16px",
    border: "none",
    background: "var(--teal-600)",
    color: "white",
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    borderRadius: 6,
    transition: "all 0.2s ease",
    boxShadow: "0 2px 4px rgba(13, 148, 136, 0.3)",
  },
};

export default function PillGroup({ options, value, onChange, ariaLabel }: PillGroupProps) {
  return (
    <div style={styles.group} role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt) => (
        <button
          key={opt.value}
          style={opt.value === value ? styles.btnActive : styles.btn}
          role="radio"
          aria-checked={opt.value === value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
