import type { CSSProperties } from "react";

interface Props {
  size?: number;
  label?: string;
}

const wrap: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  padding: "32px 16px",
  color: "var(--slate-500)",
};

export default function Spinner({ size = 32, label }: Props) {
  const ring: CSSProperties = {
    width: size,
    height: size,
    border: `${Math.max(2, Math.round(size / 12))}px solid var(--slate-200)`,
    borderTopColor: "var(--teal-500)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  };
  return (
    <div style={wrap} role="status" aria-live="polite">
      <div style={ring} />
      {label && <p style={{ fontSize: 13, margin: 0 }}>{label}</p>}
    </div>
  );
}
