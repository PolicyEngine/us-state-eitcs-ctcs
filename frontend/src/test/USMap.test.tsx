import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import USMap from "../components/USMap";
import type { StateResult } from "../types";

const mockData: StateResult[] = [
  {
    state: "CA",
    reform_type: "CTCs",
    cost: 417322270.83,
    poverty_pct_cut: 0.0034,
    child_poverty_pct_cut: 0.0097,
    poverty_gap_pct_cut: 0.006,
    gini_index_pct_cut: 0.0009,
  },
  {
    state: "NY",
    reform_type: "CTCs",
    cost: 598160186.9,
    poverty_pct_cut: 0.0147,
    child_poverty_pct_cut: 0.0409,
    poverty_gap_pct_cut: 0.0083,
    gini_index_pct_cut: 0.0025,
  },
];

function renderWithMantine(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe("USMap", () => {
  it("renders an SVG with state paths", () => {
    renderWithMantine(
      <USMap data={mockData} metric="cost" metricLabel="Cost" />,
    );
    const svg = screen.getByRole("img");
    expect(svg).toBeInTheDocument();
  });

  it("renders state path elements with test IDs", () => {
    renderWithMantine(
      <USMap data={mockData} metric="cost" metricLabel="Cost" />,
    );
    expect(screen.getByTestId("state-CA")).toBeInTheDocument();
    expect(screen.getByTestId("state-NY")).toBeInTheDocument();
  });

  it("renders the legend", () => {
    renderWithMantine(
      <USMap data={mockData} metric="cost" metricLabel="Cost" />,
    );
    expect(screen.getByText("Negative")).toBeInTheDocument();
    expect(screen.getByText("Positive")).toBeInTheDocument();
  });
});
