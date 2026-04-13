import { describe, it, expect } from "vitest";
import { METRICS, REFORM_TYPES, STATE_NAMES, SUPPORTED_YEARS } from "../types";

describe("METRICS", () => {
  it("has 3 metrics", () => {
    expect(METRICS).toHaveLength(3);
  });

  it("includes cost metric", () => {
    expect(METRICS.find((m) => m.key === "cost")).toBeDefined();
  });

  it("each metric has a format", () => {
    for (const m of METRICS) {
      expect(["currency", "percent"]).toContain(m.format);
    }
  });
});

describe("REFORM_TYPES", () => {
  it("has 3 reform types", () => {
    expect(REFORM_TYPES).toHaveLength(3);
  });

  it("includes CTCs and EITCs", () => {
    expect(REFORM_TYPES).toContain("CTCs and EITCs");
  });
});

describe("STATE_NAMES", () => {
  it("has all 51 entries (50 states + DC)", () => {
    expect(Object.keys(STATE_NAMES)).toHaveLength(51);
  });

  it("maps CA to California", () => {
    expect(STATE_NAMES["CA"]).toBe("California");
  });
});

describe("SUPPORTED_YEARS", () => {
  it("includes 2025 and 2026", () => {
    expect(SUPPORTED_YEARS).toContain(2025);
    expect(SUPPORTED_YEARS).toContain(2026);
  });
});
