import type { CSSProperties } from "react";

const styles: Record<string, CSSProperties> = {
  hero: {
    background: "linear-gradient(135deg, var(--teal-800) 0%, var(--teal-900) 100%)",
    color: "white",
    padding: "72px 32px 96px",
    position: "relative",
    overflow: "hidden",
  },
  inner: {
    maxWidth: 900,
    margin: "0 auto",
    position: "relative",
    textAlign: "center",
  },
  label: {
    display: "inline-block",
    background: "var(--teal-500)",
    color: "var(--teal-900)",
    fontFamily: "'Inter', sans-serif",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 2,
    padding: "6px 16px",
    marginBottom: 24,
    borderRadius: 100,
  },
  h1: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "clamp(32px, 5vw, 56px)",
    fontWeight: 600,
    lineHeight: 1.15,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 300,
    color: "var(--teal-100)",
    maxWidth: 620,
    margin: "0 auto",
    lineHeight: 1.7,
  },
  // Decorative circles via pseudo-element workaround (inline)
  decorBefore: {
    position: "absolute",
    top: "-50%",
    right: "-20%",
    width: 600,
    height: 600,
    background: "radial-gradient(circle, var(--teal-600) 0%, transparent 70%)",
    opacity: 0.15,
    pointerEvents: "none",
    borderRadius: "50%",
  },
  decorAfter: {
    position: "absolute",
    bottom: "-30%",
    left: "-10%",
    width: 400,
    height: 400,
    background: "radial-gradient(circle, var(--teal-500) 0%, transparent 70%)",
    opacity: 0.1,
    pointerEvents: "none",
    borderRadius: "50%",
  },
};

export default function Hero() {
  return (
    <section style={styles.hero}>
      <div style={styles.decorBefore} />
      <div style={styles.decorAfter} />
      <div style={styles.inner}>
        <h1 style={styles.h1}>
          The Impact of State Tax Credits on American Families
        </h1>
        <p style={styles.subtitle}>
          Explore how state-level Earned Income Tax Credits and Child Tax Credits
          reduce poverty across communities. Data powered by PolicyEngine
          microsimulation.
        </p>
      </div>
    </section>
  );
}
