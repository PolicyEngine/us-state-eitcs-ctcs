import type { CSSProperties } from "react";

const styles: Record<string, CSSProperties> = {
  masthead: {
    background: "var(--teal-800)",
    padding: "14px 0",
    borderBottom: "3px solid var(--teal-400)",
  },
  inner: {
    maxWidth: 1400,
    margin: "0 auto",
    padding: "0 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    textDecoration: "none",
  },
  logoImg: {
    height: 32,
    filter: "brightness(0) invert(1)",
  },
  tagline: {
    fontFamily: "'Inter', sans-serif",
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontWeight: 600,
  },
};

export default function Masthead() {
  return (
    <header style={styles.masthead}>
      <div style={styles.inner}>
        <a
          href="https://policyengine.org"
          style={styles.logo}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="/policyengine-logo.svg"
            alt="PolicyEngine"
            style={styles.logoImg}
          />
        </a>
        <span style={styles.tagline}>Data &amp; Analysis</span>
      </div>
    </header>
  );
}
