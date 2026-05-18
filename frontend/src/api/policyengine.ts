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

const API_URL = "https://api.policyengine.org/us/calculate";

function buildHousehold(
  input: HouseholdInput,
  axes?: { min: number; max: number; count: number },
) {
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

  return { household };
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

async function callApi(body: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  const json = await response.json();
  return json.result ?? json;
}

export async function calculateHousehold(
  input: HouseholdInput,
): Promise<CreditBreakdown> {
  const result = await callApi(buildHousehold(input));
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

  const result = await callApi(
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
