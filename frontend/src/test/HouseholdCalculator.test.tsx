import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import HouseholdCalculator from "../components/HouseholdCalculator";

// Plotly does not run in jsdom; the chart only needs to show which sweep it got.
vi.mock("../components/CreditsChart", () => ({
  default: ({ data }: { data: unknown[] }) => (
    <p>Chart of {data.length} earnings points</p>
  ),
}));

const SHARED_LIMIT_WORDING =
  "Everyone on your network, such as a workshop or an office, shares a " +
  "limit on calculations a minute";

const fetchMock = vi.fn<typeof fetch>();

/** Whether the firewall refuses household calculations over its limit. */
let refuseCalculations = false;

function okAnswer(result: unknown): Response {
  return new Response(JSON.stringify({ status: "ok", message: null, result }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/** Answers the single household and the earnings sweep, or refuses both. */
function answerCalculations() {
  fetchMock.mockImplementation(async (_input, init) => {
    if (refuseCalculations) {
      return new Response("Too Many Requests", {
        status: 429,
        headers: { "Content-Type": "text/plain" },
      });
    }
    const body = JSON.parse(String(init?.body));
    if (body.household.axes !== undefined) {
      return okAnswer({
        people: { you: { employment_income: { "2026": [0, 100000] } } },
        tax_units: {
          tax_unit: {
            eitc: { "2026": [0, 0] },
            ctc_value: { "2026": [1000, 2200] },
            state_eitc: { "2026": [0, 0] },
            state_ctc: { "2026": [1100, 0] },
          },
        },
      });
    }
    return okAnswer({
      tax_units: {
        tax_unit: {
          eitc: { "2026": 4000 },
          ctc_value: { "2026": 1700 },
          state_eitc: { "2026": 900 },
          state_ctc: { "2026": 1100 },
        },
      },
    });
  });
}

function calculateButton(): HTMLElement {
  return screen.getByRole("button", { name: /calculat/i });
}

/** Lets the calculations' answers arrive and React render them. */
async function letAnswersArrive(): Promise<void> {
  await act(() => vi.advanceTimersByTimeAsync(0));
}

beforeEach(() => {
  refuseCalculations = false;
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  answerCalculations();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("HouseholdCalculator when calculations are refused for the firewall's limit", () => {
  it("given an answer on screen when the next calculation is refused then the answer stays and the button counts down", async () => {
    // Given
    render(<HouseholdCalculator year={2026} />);
    fireEvent.click(calculateButton());
    await screen.findByText("Chart of 2 earnings points");
    vi.useFakeTimers();
    refuseCalculations = true;

    // When
    fireEvent.click(calculateButton());
    await letAnswersArrive();

    // Then
    expect(calculateButton()).toHaveTextContent("Calculate again in 60 s");
    expect(calculateButton()).toBeDisabled();
    const explanation = screen.getByRole("status");
    expect(explanation.textContent).toBe(`${SHARED_LIMIT_WORDING}.`);
    expect(explanation.parentElement?.textContent).toBe(
      `${SHARED_LIMIT_WORDING}. This page can calculate again in 60 s.`,
    );
    expect(screen.getByText("$4,000")).toBeInTheDocument();
    expect(screen.getByText("$7,700")).toBeInTheDocument();
    expect(screen.getByText("Chart of 2 earnings points")).toBeInTheDocument();
    expect(screen.queryByText(/HTTP 429|could not be reached/)).toBeNull();

    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(calculateButton()).toHaveTextContent("Calculate again in 59 s");
    expect(explanation.parentElement?.textContent).toBe(
      `${SHARED_LIMIT_WORDING}. This page can calculate again in 59 s.`,
    );

    await act(() => vi.advanceTimersByTimeAsync(59_000));
    expect(calculateButton()).toHaveTextContent("Calculate credits");
    expect(calculateButton()).toBeEnabled();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText("$4,000")).toBeInTheDocument();
  });

  it("given no answer on screen when the calculation is refused then the notice by the button replaces the error box", async () => {
    // Given
    vi.useFakeTimers();
    refuseCalculations = true;
    render(<HouseholdCalculator year={2026} />);

    // When
    fireEvent.click(calculateButton());
    await letAnswersArrive();

    // Then
    expect(calculateButton()).toHaveTextContent("Calculate again in 60 s");
    expect(calculateButton()).toBeDisabled();
    expect(screen.getByRole("status").textContent).toBe(
      `${SHARED_LIMIT_WORDING}.`,
    );
    expect(screen.queryByText(/HTTP 429|could not be reached/)).toBeNull();
    expect(
      screen.getByText(/Enter your household details/),
    ).toBeInTheDocument();
  });
});
