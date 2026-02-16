import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "../App";

const mockResults = [
  {
    state: "CA",
    reform_type: "CTCs and EITCs",
    cost: 1068379512.85,
    poverty_pct_cut: 0.0126,
    child_poverty_pct_cut: 0.0259,
    poverty_gap_pct_cut: 0.0163,
    gini_index_pct_cut: 0.0021,
  },
  {
    state: "CO",
    reform_type: "CTCs and EITCs",
    cost: 974795548.75,
    poverty_pct_cut: 0.0992,
    child_poverty_pct_cut: 0.3564,
    poverty_gap_pct_cut: 0.0441,
    gini_index_pct_cut: 0.0015,
  },
];

beforeEach(() => {
  globalThis.fetch = async () =>
    ({
      ok: true,
      json: async () => mockResults,
    }) as Response;
});

describe("App", () => {
  it("shows loading state initially", () => {
    render(<App />);
    expect(screen.getByText("Loading data...")).toBeInTheDocument();
  });

  it("renders the title after loading", async () => {
    render(<App />);
    await waitFor(() => {
      expect(
        screen.getByText("State EITC and CTC impacts"),
      ).toBeInTheDocument();
    });
  });

  it("renders the description text", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/31 states/)).toBeInTheDocument();
    });
  });

  it("renders the PolicyEngine attribution", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("PolicyEngine")).toBeInTheDocument();
    });
  });

  it("shows error state on fetch failure", async () => {
    globalThis.fetch = async () =>
      ({
        ok: false,
        status: 500,
      }) as Response;

    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("Failed to load data")).toBeInTheDocument();
    });
  });
});
