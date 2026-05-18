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

const API_URL = "https://api.policyengine.org/us/calculate";

function buildHousehold(input: HouseholdInput) {
  const y = String(input.year);
  const isJoint = input.filingStatus === "JOINT";

  const people: Record<string, Record<string, Record<string, number | null>>> = {
    you: {
      age: { [y]: input.primaryAge },
      employment_income: { [y]: input.employmentIncome },
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

  return {
    household: {
      people,
      families: { family: { members: allMembers } },
      spm_units: { spm_unit: { members: allMembers } },
      marital_units: isJoint
        ? {
            adult_unit: { members: adultMembers },
            ...Object.fromEntries(
              childMembers.map((c) => [`${c}_unit`, { members: [c] }]),
            ),
          }
        : {
            adult_unit: { members: ["you"] },
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
    },
  };
}

function extract(
  result: Record<string, unknown>,
  varName: string,
  year: number,
): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = result as any;
  const tu = r?.household?.tax_units?.tax_unit;
  const v = tu?.[varName]?.[String(year)];
  return typeof v === "number" ? v : 0;
}

export async function calculateHousehold(
  input: HouseholdInput,
): Promise<CreditBreakdown> {
  const body = buildHousehold(input);
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  const result = json.result ?? json;

  return {
    federalEitc: extract(result, "eitc", input.year),
    federalCtc: extract(result, "ctc_value", input.year),
    stateEitc: extract(result, "state_eitc", input.year),
    stateCtc: extract(result, "state_ctc", input.year),
  };
}
