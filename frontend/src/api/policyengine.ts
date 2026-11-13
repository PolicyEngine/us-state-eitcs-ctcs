import {
  createPolicyEngineApiClient,
  DEFAULT_BASE_URL,
  PolicyEngineApiError,
  RATE_LIMIT_WAIT_MILLISECONDS,
} from "@policyengine/api-client";

export type FilingStatus = "SINGLE" | "HEAD_OF_HOUSEHOLD" | "JOINT";

export interface HouseholdInput {
  state: string;
  year: number;
  filingStatus: FilingStatus;
  primaryAge: number;
  spouseAge?: number;
  employmentIncome: number;
  spouseEmploymentIncome?: number;
  childAges: number[];
}

export interface CreditBreakdown {
  federalEitc: number;
  federalCtc: number;
  stateEitc: number;
  stateCtc: number;
}

export interface SweepPoint extends CreditBreakdown {
  earnings: number;
}

// www.policyengine.org's dashboard API, which forwards households to the
// PolicyEngine Public API with PolicyEngine's credential.
const policyengine = createPolicyEngineApiClient();

/**
 * What the page says about the firewall's limit on household calculations,
 * which everyone behind one IP address shares. Callers add the full stop.
 */
export const SHARED_LIMIT_EXPLANATION =
  "Everyone on your network, such as a workshop or an office, shares a " +
  "limit on calculations a minute";

/**
 * What a calculation held back during a pause says, and the pause's reason
 * when none is given: the pause may have started from a request with no
 * answer, which only may have met the limit.
 */
const LIMIT_MAY_HAVE_BEEN_REACHED = `${SHARED_LIMIT_EXPLANATION}, which may have been reached.`;

/**
 * When the page may send household calculations again after a refusal for
 * the firewall's limit, in `Date.now()` milliseconds. Every household
 * calculation checks it before it is sent.
 */
let householdCalculationsPausedUntil = 0;
/** The user-facing message of the failure that started the pause. */
let pauseReason = LIMIT_MAY_HAVE_BEEN_REACHED;
const pauseListeners = new Set<() => void>();

/**
 * Stops the page from sending household calculations for `milliseconds`
 * (the firewall's 60-second window unless given); 0 ends a pause.
 * `reason` is the message the page shows during the pause.
 */
export function pauseHouseholdCalculations(
  milliseconds: number = RATE_LIMIT_WAIT_MILLISECONDS,
  reason: string = LIMIT_MAY_HAVE_BEEN_REACHED,
): void {
  householdCalculationsPausedUntil = Date.now() + milliseconds;
  pauseReason = reason;
  pauseListeners.forEach((listener) => listener());
}

/** Milliseconds until the page may send household calculations again; 0 when it may now. */
export function householdCalculationPauseRemaining(): number {
  return Math.max(0, householdCalculationsPausedUntil - Date.now());
}

/** The user-facing message of the failure that started the latest pause. */
export function householdCalculationPauseReason(): string {
  return pauseReason;
}

/** Calls `listener` whenever a pause starts or is ended early; returns the unsubscribe function. */
export function onHouseholdCalculationPause(listener: () => void): () => void {
  pauseListeners.add(listener);
  return () => {
    pauseListeners.delete(listener);
  };
}

/** A household calculation failed; `message` is written for the user. */
export class HouseholdCalculationError extends Error {
  override name = "HouseholdCalculationError";

  constructor(
    message: string,
    /** The dashboard API's HTTP status, or null when no answer was read. */
    readonly status: number | null,
    /**
     * Whether the firewall's limit may have refused it: a 429, no readable
     * answer on another origin (which is how such a page sees a 429), or a
     * calculation held back during the pause after a refusal.
     */
    readonly rateLimited: boolean,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

/**
 * Whether the page is served from the dashboard API's own origin
 * (www.policyengine.org), where the firewall's 429 is readable.
 */
function pageSharesDashboardApiOrigin(): boolean {
  return globalThis.location?.origin === new URL(DEFAULT_BASE_URL).origin;
}

/** Turns a failure of the dashboard API client into a message for the user. */
function calculationError(error: PolicyEngineApiError): HouseholdCalculationError {
  if (error.status === 429) {
    return new HouseholdCalculationError(
      `${SHARED_LIMIT_EXPLANATION}, and it has been reached.`,
      429,
      true,
      { cause: error },
    );
  }
  if (error.status === null) {
    if (pageSharesDashboardApiOrigin()) {
      // The firewall's 429 would be readable here, so no answer means a
      // network failure.
      return new HouseholdCalculationError(
        "PolicyEngine's calculation service could not be reached. Check " +
          "your connection and try again.",
        null,
        false,
        { cause: error },
      );
    }
    // On another origin, such as the dashboard's own Vercel host, the
    // firewall's 429 has no CORS headers, so the browser reports a network
    // failure. So does the dashboard API's 403 for an origin it does not
    // allow.
    return new HouseholdCalculationError(
      "PolicyEngine's calculation service could not be reached. " +
        `${SHARED_LIMIT_EXPLANATION}, which may have been reached.`,
      null,
      true,
      { cause: error },
    );
  }
  // Any other refusal keeps the client's message, which is the dashboard
  // API's own message when its answer has one.
  return new HouseholdCalculationError(error.message, error.status, false, {
    cause: error,
  });
}

function buildHousehold(
  input: HouseholdInput,
  axes?: { min: number; max: number; count: number },
): Record<string, unknown> {
  const y = String(input.year);
  const isJoint = input.filingStatus === "JOINT";

  const people: Record<string, Record<string, Record<string, number | null>>> = {
    you: {
      age: { [y]: input.primaryAge },
      employment_income: {
        [y]: axes ? null : input.employmentIncome,
      },
    },
  };

  const adultMembers = ["you"];
  if (isJoint) {
    people.spouse = {
      age: { [y]: input.spouseAge ?? 40 },
      employment_income: { [y]: input.spouseEmploymentIncome ?? 0 },
    };
    adultMembers.push("spouse");
  }

  const childMembers: string[] = [];
  input.childAges.forEach((age, i) => {
    const id = `child_${i}`;
    people[id] = { age: { [y]: age } };
    childMembers.push(id);
  });

  const allMembers = [...adultMembers, ...childMembers];

  const household: Record<string, unknown> = {
    people,
    families: { family: { members: allMembers } },
    spm_units: { spm_unit: { members: allMembers } },
    marital_units: {
      adult_unit: { members: adultMembers },
      ...Object.fromEntries(
        childMembers.map((c) => [`${c}_unit`, { members: [c] }]),
      ),
    },
    tax_units: {
      tax_unit: {
        members: allMembers,
        filing_status: { [y]: input.filingStatus },
        eitc: { [y]: null },
        ctc_value: { [y]: null },
        state_eitc: { [y]: null },
        state_ctc: { [y]: null },
      },
    },
    households: {
      household: {
        members: allMembers,
        state_name: { [y]: input.state },
      },
    },
  };

  if (axes) {
    household.axes = [
      [
        {
          name: "employment_income",
          period: y,
          min: axes.min,
          max: axes.max,
          count: axes.count,
        },
      ],
    ];
  }

  return household;
}

function pickScalar(
  result: Record<string, unknown>,
  varName: string,
  year: number,
): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = result as any;
  const v = r?.tax_units?.tax_unit?.[varName]?.[String(year)];
  return typeof v === "number" ? v : 0;
}

function pickArray(
  result: Record<string, unknown>,
  path: string[],
  varName: string,
  year: number,
): number[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cursor: any = result;
  for (const seg of path) cursor = cursor?.[seg];
  const v = cursor?.[varName]?.[String(year)];
  return Array.isArray(v) ? v.map((x) => Number(x) || 0) : [];
}

/**
 * Calculates a US household under current law; resolves with its result.
 * Sends nothing while calculations are paused after a refusal for the
 * firewall's limit, and never retries a failure.
 */
async function calculateUsHousehold(
  household: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (householdCalculationPauseRemaining() > 0) {
    // Held back during the pause after a refusal, so never sent.
    throw new HouseholdCalculationError(LIMIT_MAY_HAVE_BEEN_REACHED, null, true);
  }
  try {
    return await policyengine.calculateHousehold<Record<string, unknown>>({
      country: "us",
      household,
    });
  } catch (error) {
    if (!(error instanceof PolicyEngineApiError)) {
      throw error;
    }
    const failure = calculationError(error);
    if (failure.rateLimited) {
      // Pause at once, keeping this failure's message for the page to show,
      // even if the page's other calculation has already failed and the
      // caller never sees this refusal.
      pauseHouseholdCalculations(RATE_LIMIT_WAIT_MILLISECONDS, failure.message);
    }
    throw failure;
  }
}

export async function calculateHousehold(
  input: HouseholdInput,
): Promise<CreditBreakdown> {
  const result = await calculateUsHousehold(buildHousehold(input));
  return {
    federalEitc: pickScalar(result, "eitc", input.year),
    federalCtc: pickScalar(result, "ctc_value", input.year),
    stateEitc: pickScalar(result, "state_eitc", input.year),
    stateCtc: pickScalar(result, "state_ctc", input.year),
  };
}

export async function sweepEarnings(
  baseInput: HouseholdInput,
  options: { min?: number; max?: number; count?: number } = {},
): Promise<SweepPoint[]> {
  const currentEarnings = baseInput.employmentIncome;
  const min = options.min ?? 0;
  const max = options.max ?? Math.max(200_000, currentEarnings * 2);
  const count = options.count ?? 401;

  const result = await calculateUsHousehold(
    buildHousehold(baseInput, { min, max, count }),
  );
  const year = baseInput.year;

  const earnings = pickArray(result, ["people", "you"], "employment_income", year);
  const eitc = pickArray(result, ["tax_units", "tax_unit"], "eitc", year);
  const ctc = pickArray(result, ["tax_units", "tax_unit"], "ctc_value", year);
  const stateEitc = pickArray(result, ["tax_units", "tax_unit"], "state_eitc", year);
  const stateCtc = pickArray(result, ["tax_units", "tax_unit"], "state_ctc", year);

  return earnings.map((e, i) => ({
    earnings: e,
    federalEitc: eitc[i] ?? 0,
    federalCtc: ctc[i] ?? 0,
    stateEitc: stateEitc[i] ?? 0,
    stateCtc: stateCtc[i] ?? 0,
  }));
}
