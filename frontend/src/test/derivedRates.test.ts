import { describe, it, expect } from "vitest";
import { formatValue } from "../utils";
import { withDerivedRates } from "../data/useData";

describe("formatValue pp format", () => {
  it("renders a rate difference in percentage points", () => {
    expect(formatValue(0.0052, "pp")).toBe("0.52pp");
    expect(formatValue(0, "pp")).toBe("0.00pp");
    expect(formatValue(null, "pp")).toBe("N/A");
  });
});

describe("withDerivedRates", () => {
  const row = {
    baseline_poverty_count: 100_000,
    reform_poverty_count: 110_000,
    population: 1_000_000,
    baseline_child_poverty_count: 30_000,
    reform_child_poverty_count: 36_000,
    child_population: 300_000,
  };

  it("derives rates and pp cuts from the weighted counts", () => {
    const r = withDerivedRates(row);
    expect(r.baseline_poverty_rate).toBeCloseTo(0.1);
    expect(r.reform_poverty_rate).toBeCloseTo(0.11);
    // Repealing the credit raises poverty 10% -> 11%, so the credit cuts
    // poverty by 1 percentage point (positive = reduction).
    expect(r.poverty_pp_cut).toBeCloseTo(0.01);
    expect(r.baseline_child_poverty_rate).toBeCloseTo(0.1);
    expect(r.reform_child_poverty_rate).toBeCloseTo(0.12);
    expect(r.child_poverty_pp_cut).toBeCloseTo(0.02);
  });

  it("returns zero rates for empty populations", () => {
    const r = withDerivedRates({
      ...row,
      population: 0,
      child_population: 0,
    });
    expect(r.baseline_poverty_rate).toBe(0);
    expect(r.poverty_pp_cut).toBe(0);
    expect(r.child_poverty_pp_cut).toBe(0);
  });
});
