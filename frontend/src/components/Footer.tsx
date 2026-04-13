import type { CSSProperties } from "react";
import type { SupportedYear } from "../types";

interface FooterProps {
  year: SupportedYear;
}

const styles: Record<string, CSSProperties> = {
  footer: {
    background: "var(--teal-900)",
    color: "var(--teal-300)",
    padding: "40px 32px",
    marginTop: 64,
    textAlign: "center",
    fontSize: 13,
  },
  link: {
    color: "var(--teal-200)",
    textDecoration: "none",
    borderBottom: "1px solid var(--teal-700)",
  },
};

export default function Footer({ year }: FooterProps) {
  return (
    <footer style={styles.footer}>
      Data calculated using PolicyEngine microsimulation model for {year}
      &nbsp;|&nbsp;
      <a
        href="https://policyengine.org"
        target="_blank"
        rel="noopener noreferrer"
        style={styles.link}
      >
        policyengine.org
      </a>
    </footer>
  );
}
