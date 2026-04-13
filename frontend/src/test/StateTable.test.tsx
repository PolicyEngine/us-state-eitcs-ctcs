import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import StateTable from "../components/StateTable";
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
    year: 2025,
  },
  {
    state: "CO",
    reform_type: "CTCs",
    cost: 765354890.03,
    poverty_pct_cut: 0.0881,
    child_poverty_pct_cut: 0.3316,
    poverty_gap_pct_cut: 0.0358,
    gini_index_pct_cut: 0.0004,
    year: 2025,
  },
  {
    state: "AL",
    reform_type: "CTCs",
    cost: 0,
    poverty_pct_cut: 0,
    child_poverty_pct_cut: 0,
    poverty_gap_pct_cut: 0,
    gini_index_pct_cut: 0,
    year: 2025,
  },
];

function renderWithMantine(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe("StateTable", () => {
  it("renders state names for non-zero values", () => {
    renderWithMantine(
      <StateTable data={mockData} metric="cost" metricLabel="Cost" />,
    );
    expect(screen.getByText("California")).toBeInTheDocument();
    expect(screen.getByText("Colorado")).toBeInTheDocument();
    expect(screen.queryByText("Alabama")).not.toBeInTheDocument();
  });

  it("sorts by value descending", () => {
    renderWithMantine(
      <StateTable data={mockData} metric="cost" metricLabel="Cost" />,
    );
    const rows = screen.getAllByRole("row");
    // Header row + 2 data rows
    expect(rows).toHaveLength(3);
    // Colorado (higher cost) should be rank 1
    expect(rows[1]).toHaveTextContent("Colorado");
    expect(rows[2]).toHaveTextContent("California");
  });

  it("shows empty message when no states have values", () => {
    const zeroData: StateResult[] = [
      {
        state: "AL",
        reform_type: "CTCs",
        cost: 0,
        poverty_pct_cut: 0,
        child_poverty_pct_cut: 0,
        poverty_gap_pct_cut: 0,
        gini_index_pct_cut: 0,
        year: 2025,
      },
    ];
    renderWithMantine(
      <StateTable data={zeroData} metric="cost" metricLabel="Cost" />,
    );
    expect(screen.getByText(/no states/i)).toBeInTheDocument();
  });

  it("displays the metric label in the header", () => {
    renderWithMantine(
      <StateTable
        data={mockData}
        metric="poverty_pct_cut"
        metricLabel="Poverty reduction"
      />,
    );
    expect(screen.getByText("Poverty reduction")).toBeInTheDocument();
  });
});
