import { describe, it, expect } from "vitest";
import { formatValue } from "../utils";

describe("formatValue", () => {
  it("formats cost in billions", () => {
    expect(formatValue(1068379512.854, "currency")).toBe("$1.07B");
  });

  it("formats cost in millions", () => {
    expect(formatValue(35089042.99, "currency")).toBe("$35.1M");
  });

  it("formats cost in thousands", () => {
    expect(formatValue(5500, "currency")).toBe("$5.5K");
  });

  it("formats zero cost", () => {
    expect(formatValue(0, "currency")).toBe("$0");
  });

  it("formats percentage metrics", () => {
    expect(formatValue(0.0126, "percent")).toBe("1.26%");
  });

  it("formats zero percentage", () => {
    expect(formatValue(0, "percent")).toBe("0.00%");
  });

  it("formats negative percentage", () => {
    expect(formatValue(-0.0071, "percent")).toBe("-0.71%");
  });

  it("returns N/A for null", () => {
    expect(formatValue(null, "currency")).toBe("N/A");
  });

  it("returns N/A for undefined", () => {
    expect(formatValue(undefined, "currency")).toBe("N/A");
  });
});
