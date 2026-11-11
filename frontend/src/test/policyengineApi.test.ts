import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  calculateHousehold,
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

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
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
