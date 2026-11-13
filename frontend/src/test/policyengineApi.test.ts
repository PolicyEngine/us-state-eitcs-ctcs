import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  calculateHousehold,
  householdCalculationPauseRemaining,
  onHouseholdCalculationPause,
  pauseHouseholdCalculations,
  SHARED_LIMIT_EXPLANATION,
  sweepEarnings,
  type HouseholdInput,
} from "../api/policyengine";

const DASHBOARD_API_CALCULATE_URL =
  "https://www.policyengine.org/api/household/calculate";

const INPUT: HouseholdInput = {
  state: "CA",
  year: 2026,
  filingStatus: "HEAD_OF_HOUSEHOLD",
  primaryAge: 30,
  employmentIncome: 20000,
  childAges: [4],
};

const fetchMock = vi.fn<typeof fetch>();

function jsonAnswer(body: unknown, statusCode = 200): Response {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "Content-Type": "application/json" },
  });
}

/** Answers only the dashboard API; any other address is unreachable. */
function answerFromDashboardApi(
  answerFor: (body: Record<string, unknown>) => Response,
) {
  fetchMock.mockImplementation(async (input, init) => {
    if (String(input) !== DASHBOARD_API_CALCULATE_URL) {
      throw new TypeError(`Failed to fetch ${String(input)}`);
    }
    return answerFor(JSON.parse(String(init?.body)));
  });
}

function requestBodies(): Record<string, unknown>[] {
  return fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
}

function okAnswer(result: unknown): Response {
  return jsonAnswer({ status: "ok", message: null, result });
}

/** The firewall's refusal over its limit: text/plain, with no Retry-After. */
function tooManyRequests(): Response {
  return new Response("Too Many Requests", {
    status: 429,
    headers: { "Content-Type": "text/plain" },
  });
}

/** Resolves with the error a calculation rejects with. */
async function failureOf(calculation: Promise<unknown>): Promise<unknown> {
  try {
    await calculation;
  } catch (error) {
    return error;
  }
  throw new Error("The calculation did not fail.");
}

const SHARED_LIMIT_WORDING =
  "Everyone on your network, such as a workshop or an office, shares a " +
  "limit on calculations a minute";

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  // Real time first, so that ending the pause ends it in real time.
  vi.useRealTimers();
  pauseHouseholdCalculations(0);
});

describe("household calculations through the dashboard API", () => {
  it("given a household then calculateHousehold sends it to the dashboard API for the US", async () => {
    // Given
    answerFromDashboardApi(() => okAnswer({}));

    // When
    await calculateHousehold(INPUT).catch(() => undefined);

    // Then
    expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
      DASHBOARD_API_CALCULATE_URL,
    ]);
    const [body] = requestBodies();
    expect(body.country).toBe("us");
    expect(body).not.toHaveProperty("policy");
    expect(body.household).toMatchObject({
      households: { household: { state_name: { "2026": "CA" } } },
      tax_units: { tax_unit: { filing_status: { "2026": "HEAD_OF_HOUSEHOLD" } } },
    });
  });

  it("given the dashboard API's answer then calculateHousehold reads the credits from its result", async () => {
    // Given
    answerFromDashboardApi(() =>
      okAnswer({
        tax_units: {
          tax_unit: {
            eitc: { "2026": 4000 },
            ctc_value: { "2026": 1700 },
            state_eitc: { "2026": 900 },
            state_ctc: { "2026": 1100 },
          },
        },
      }),
    );

    // When
    const credits = await calculateHousehold(INPUT).catch(() => null);

    // Then
    expect(credits).toEqual({
      federalEitc: 4000,
      federalCtc: 1700,
      stateEitc: 900,
      stateCtc: 1100,
    });
  });

  it("given a sweep then sweepEarnings sends one household with an earnings axis and reads each point", async () => {
    // Given
    answerFromDashboardApi(() =>
      okAnswer({
        people: { you: { employment_income: { "2026": [0, 100000] } } },
        tax_units: {
          tax_unit: {
            eitc: { "2026": [0, 0] },
            ctc_value: { "2026": [1000, 2200] },
            state_eitc: { "2026": [0, 0] },
            state_ctc: { "2026": [1100, 0] },
          },
        },
      }),
    );

    // When
    const points = await sweepEarnings(INPUT, { min: 0, max: 100000, count: 2 }).catch(
      () => null,
    );

    // Then
    expect(requestBodies()).toHaveLength(1);
    expect(requestBodies()[0].household).toMatchObject({
      axes: [
        [{ name: "employment_income", period: "2026", min: 0, max: 100000, count: 2 }],
      ],
    });
    expect(points).toEqual([
      { earnings: 0, federalEitc: 0, federalCtc: 1000, stateEitc: 0, stateCtc: 1100 },
      { earnings: 100000, federalEitc: 0, federalCtc: 2200, stateEitc: 0, stateCtc: 0 },
    ]);
  });

  it("given the dashboard API refuses the household then the error carries its message", async () => {
    // Given
    answerFromDashboardApi(() =>
      jsonAnswer(
        { status: "error", message: "Unknown state_name value.", result: null },
        400,
      ),
    );

    // When
    const calculation = calculateHousehold(INPUT);

    // Then
    await expect(calculation).rejects.toThrow("Unknown state_name value.");
  });
});

describe("household calculations refused for the firewall's limit", () => {
  it("given the page's wording then the shared-limit explanation is exported verbatim", () => {
    // Then
    expect(SHARED_LIMIT_EXPLANATION).toBe(SHARED_LIMIT_WORDING);
  });

  it("given a 429 then calculateHousehold explains the shared limit and marks the failure rate-limited", async () => {
    // Given
    answerFromDashboardApi(() => tooManyRequests());

    // When
    const failure = await failureOf(calculateHousehold(INPUT));

    // Then
    expect(failure).toMatchObject({
      message: `${SHARED_LIMIT_WORDING}, and it has been reached.`,
      status: 429,
      rateLimited: true,
    });
  });

  it("given no answer on another origin then calculateHousehold says the shared limit may have been reached", async () => {
    // Given: jsdom's page is on http://localhost:3000, which cannot read
    // the firewall's 429 (it has no CORS headers), so the browser reports
    // a network failure instead.
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    // When
    const failure = await failureOf(calculateHousehold(INPUT));

    // Then
    expect(failure).toMatchObject({
      message:
        "PolicyEngine's calculation service could not be reached. " +
        `${SHARED_LIMIT_WORDING}, which may have been reached.`,
      status: null,
      rateLimited: true,
    });
  });

  it("given no answer on www.policyengine.org then calculateHousehold reports a network failure and does not pause", async () => {
    // Given: the page shares the dashboard API's origin, so a 429 would be
    // readable there; no answer means a network failure.
    vi.stubGlobal("location", { origin: "https://www.policyengine.org" });
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    // When
    const failure = await failureOf(calculateHousehold(INPUT));
    await failureOf(calculateHousehold(INPUT));

    // Then
    expect(failure).toMatchObject({
      message:
        "PolicyEngine's calculation service could not be reached. Check " +
        "your connection and try again.",
      status: null,
      rateLimited: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(householdCalculationPauseRemaining()).toBe(0);
  });

  it("given a 429 then neither calculation is sent until a minute has passed", async () => {
    // Given
    vi.useFakeTimers();
    answerFromDashboardApi(() => tooManyRequests());
    await failureOf(calculateHousehold(INPUT));

    // When
    const heldBackCredits = await failureOf(calculateHousehold(INPUT));
    const heldBackSweep = await failureOf(sweepEarnings(INPUT));

    // Then
    const heldBackFailure = {
      message: `${SHARED_LIMIT_WORDING}, which may have been reached.`,
      rateLimited: true,
    };
    expect(heldBackCredits).toMatchObject(heldBackFailure);
    expect(heldBackSweep).toMatchObject(heldBackFailure);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(householdCalculationPauseRemaining()).toBe(60_000);

    vi.advanceTimersByTime(59_999);
    await failureOf(calculateHousehold(INPUT));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    await failureOf(calculateHousehold(INPUT));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("given the two calculations sent together when the sweep is refused after the other has failed then later calculations are held back", async () => {
    // Given: the single household fails at once for another reason, and
    // the firewall refuses the sweep after Promise.all has already
    // rejected with that other failure.
    let refuseSweep = () => {};
    const sweepRefused = new Promise<void>((resolve) => {
      refuseSweep = resolve;
    });
    fetchMock.mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body));
      if (body.household.axes !== undefined) {
        await sweepRefused;
        return tooManyRequests();
      }
      return jsonAnswer(
        { status: "error", message: "Internal error", result: null },
        500,
      );
    });
    const sweep = sweepEarnings(INPUT);
    const firstFailure = await failureOf(
      Promise.all([calculateHousehold(INPUT), sweep]),
    );
    refuseSweep();
    await failureOf(sweep);

    // When
    const heldBack = await failureOf(calculateHousehold(INPUT));

    // Then
    expect(firstFailure).toMatchObject({ status: 500 });
    expect(heldBack).toMatchObject({ rateLimited: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("given a 504 then calculateHousehold sends it once, keeps its message and does not pause", async () => {
    // Given: the dashboard API has already waited 750 s for this answer.
    answerFromDashboardApi(
      () => new Response("Gateway Timeout", { status: 504 }),
    );

    // When
    const failure = await failureOf(calculateHousehold(INPUT));
    const requestsAfterFailure = fetchMock.mock.calls.length;
    await failureOf(calculateHousehold(INPUT));

    // Then
    expect(failure).toMatchObject({
      message: "The dashboard API answered HTTP 504.",
      status: 504,
      rateLimited: false,
    });
    expect(requestsAfterFailure).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("given a listener then it hears a pause start and end early, and nothing after unsubscribing", () => {
    // Given
    vi.useFakeTimers();
    expect(onHouseholdCalculationPause).toBeTypeOf("function");
    const listener = vi.fn();
    const unsubscribe = onHouseholdCalculationPause(listener);

    // When
    pauseHouseholdCalculations();
    const remainingDuringPause = householdCalculationPauseRemaining();
    pauseHouseholdCalculations(0);
    const remainingAfterEnd = householdCalculationPauseRemaining();
    unsubscribe();
    pauseHouseholdCalculations();

    // Then
    expect(remainingDuringPause).toBe(60_000);
    expect(remainingAfterEnd).toBe(0);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
