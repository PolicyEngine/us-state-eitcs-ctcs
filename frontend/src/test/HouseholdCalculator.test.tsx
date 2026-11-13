import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { pauseHouseholdCalculations } from "../api/policyengine";
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

const LIMIT_REACHED = `${SHARED_LIMIT_WORDING}, and it has been reached.`;

const fetchMock = vi.fn<typeof fetch>();

type Answer = (body: {
  household: Record<string, unknown>;
}) => Response | Promise<Response>;

/** How the dashboard API answers once a test makes calculations fail; null answers them. */
let failingAnswer: Answer | null = null;

function okAnswer(result: unknown): Response {
  return new Response(JSON.stringify({ status: "ok", message: null, result }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/** The firewall's refusal over its limit: text/plain, with no Retry-After. */
function tooManyRequests(): Response {
  return new Response("Too Many Requests", {
    status: 429,
    headers: { "Content-Type": "text/plain" },
  });
}

function internalError(): Response {
  return new Response(
    JSON.stringify({ status: "error", message: "Internal error", result: null }),
    { status: 500, headers: { "Content-Type": "application/json" } },
  );
}

/** Answers the single household and the earnings sweep, or fails as the test says. */
function answerCalculations() {
  fetchMock.mockImplementation(async (_input, init) => {
    const body = JSON.parse(String(init?.body));
    if (failingAnswer !== null) {
      return failingAnswer(body);
    }
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

/** Calculates once with real timers and waits for the credits and chart. */
async function showAnAnswer(): Promise<void> {
  render(<HouseholdCalculator year={2026} />);
  fireEvent.click(calculateButton());
  await screen.findByText("Chart of 2 earnings points");
}

beforeEach(() => {
  failingAnswer = null;
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  answerCalculations();
});

afterEach(() => {
  // Unmount first, so that ending the pause below updates no mounted component
  // outside act().
  cleanup();
  vi.unstubAllGlobals();
  // Real time first, so that ending the pause ends it in real time.
  vi.useRealTimers();
  pauseHouseholdCalculations(0);
});

describe("HouseholdCalculator when calculations are refused for the firewall's limit", () => {
  it("given an answer on screen when the next calculation is refused then the answer stays and the button counts down", async () => {
    // Given
    await showAnAnswer();
    vi.useFakeTimers();
    failingAnswer = () => tooManyRequests();

    // When
    fireEvent.click(calculateButton());
    await letAnswersArrive();

    // Then
    expect(calculateButton()).toHaveTextContent("Calculate again in 60 s");
    expect(calculateButton()).toBeDisabled();
    const explanation = screen.getByRole("status");
    expect(explanation.textContent).toBe(LIMIT_REACHED);
    expect(explanation.parentElement?.textContent).toBe(
      `${LIMIT_REACHED} This page can calculate again in 60 s.`,
    );
    expect(screen.getByText("$4,000")).toBeInTheDocument();
    expect(screen.getByText("$7,700")).toBeInTheDocument();
    expect(screen.getByText("Chart of 2 earnings points")).toBeInTheDocument();
    // Only the notice shows the refusal: an error box with it would make two.
    expect(screen.getAllByText(LIMIT_REACHED)).toHaveLength(1);

    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(calculateButton()).toHaveTextContent("Calculate again in 59 s");
    expect(explanation.parentElement?.textContent).toBe(
      `${LIMIT_REACHED} This page can calculate again in 59 s.`,
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
    failingAnswer = () => tooManyRequests();
    render(<HouseholdCalculator year={2026} />);

    // When
    fireEvent.click(calculateButton());
    await letAnswersArrive();

    // Then
    expect(calculateButton()).toHaveTextContent("Calculate again in 60 s");
    expect(calculateButton()).toBeDisabled();
    expect(screen.getByRole("status").textContent).toBe(LIMIT_REACHED);
    // Only the notice shows the refusal: an error box with it would make two.
    expect(screen.getAllByText(LIMIT_REACHED)).toHaveLength(1);
    expect(
      screen.getByText(/Enter your household details/),
    ).toBeInTheDocument();
  });

  it("given no answer from the dashboard API on another origin then the notice says the service could not be reached and the limit may have been reached", async () => {
    // Given: jsdom's page is on http://localhost:3000, which cannot read
    // the firewall's 429 (it has no CORS headers).
    vi.useFakeTimers();
    failingAnswer = () => {
      throw new TypeError("Failed to fetch");
    };
    render(<HouseholdCalculator year={2026} />);

    // When
    fireEvent.click(calculateButton());
    await letAnswersArrive();

    // Then
    const reason =
      "PolicyEngine's calculation service could not be reached. " +
      `${SHARED_LIMIT_WORDING}, which may have been reached.`;
    expect(screen.getByRole("status").textContent).toBe(reason);
    expect(screen.getByRole("status").parentElement?.textContent).toBe(
      `${reason} This page can calculate again in 60 s.`,
    );
    expect(calculateButton()).toBeDisabled();
    // Only the notice shows the refusal: an error box with it would make two.
    expect(screen.getAllByText(reason)).toHaveLength(1);
  });

  it("given an answer on screen when the single household fails first and the sweep is refused afterwards then the error box shows that failure and the notice shows the refusal", async () => {
    // Given: Promise.all rejects with the single household's failure
    // before the firewall refuses the sweep.
    await showAnAnswer();
    vi.useFakeTimers();
    let refuseSweep = () => {};
    const sweepRefused = new Promise<void>((resolve) => {
      refuseSweep = resolve;
    });
    failingAnswer = async (body) => {
      if (body.household.axes !== undefined) {
        await sweepRefused;
        return tooManyRequests();
      }
      return internalError();
    };

    // When
    fireEvent.click(calculateButton());
    await letAnswersArrive();
    refuseSweep();
    await letAnswersArrive();

    // Then
    expect(screen.getByRole("status").textContent).toBe(LIMIT_REACHED);
    expect(calculateButton()).toHaveTextContent("Calculate again in 60 s");
    expect(screen.getByText("Internal error")).toBeInTheDocument();
    expect(screen.queryByText("$4,000")).toBeNull();
    expect(screen.queryByText("Chart of 2 earnings points")).toBeNull();
  });
});

describe("HouseholdCalculator when a calculation fails for another reason", () => {
  it("given an answer on screen when the next calculation fails then the error box shows its message and the credits and chart are cleared", async () => {
    // Given
    await showAnAnswer();
    vi.useFakeTimers();
    failingAnswer = () => internalError();

    // When
    fireEvent.click(calculateButton());
    await letAnswersArrive();

    // Then
    expect(screen.getByText("Internal error")).toBeInTheDocument();
    expect(screen.queryByText("$4,000")).toBeNull();
    expect(screen.queryByText("Chart of 2 earnings points")).toBeNull();
    expect(calculateButton()).toHaveTextContent("Calculate credits");
    expect(calculateButton()).toBeEnabled();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
