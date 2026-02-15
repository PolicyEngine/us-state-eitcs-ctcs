import { describe, it, expect } from "vitest";
import { formatMetricValue } from "../utils";

describe("formatMetricValue", () => {
  it("formats cost in billions", () => {
    expect(formatMetricValue(1068379512.854, "cost")).toBe("$1.1B");
  });

  it("formats cost in millions", () => {
    expect(formatMetricValue(35089042.99, "cost")).toBe("$35.1M");
  });

  it("formats negative cost", () => {
    expect(formatMetricValue(-5464695529.77, "cost")).toBe("-$5.5B");
  });

  it("formats zero cost", () => {
    expect(formatMetricValue(0, "cost")).toBe("$0");
  });

  it("formats percentage metrics", () => {
    expect(formatMetricValue(0.0126, "poverty_pct_cut")).toBe("1.26%");
  });

  it("formats zero percentage", () => {
    expect(formatMetricValue(0, "gini_index_pct_cut")).toBe("0.00%");
  });

  it("formats negative percentage", () => {
    expect(formatMetricValue(-0.0071, "poverty_pct_cut")).toBe("-0.71%");
  });
});
