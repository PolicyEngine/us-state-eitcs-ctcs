import { describe, it, expect } from "vitest";
import { METRICS, REFORM_TYPES, STATE_NAMES } from "../types";

describe("METRICS", () => {
  it("has 5 metrics", () => {
    expect(METRICS).toHaveLength(5);
  });

  it("includes cost metric", () => {
    expect(METRICS.find((m) => m.key === "cost")).toBeDefined();
  });

  it("uses sentence case for labels", () => {
    for (const m of METRICS) {
      const words = m.label.split(" ");
      if (words.length > 1) {
        for (let i = 1; i < words.length; i++) {
          expect(words[i][0]).toBe(words[i][0].toLowerCase());
        }
      }
    }
  });
});

describe("REFORM_TYPES", () => {
  it("has 4 reform types", () => {
    expect(REFORM_TYPES).toHaveLength(4);
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
