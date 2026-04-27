export interface StateResult {
  state: string;
  reform_type: string;
  cost: number;
  poverty_pct_cut: number;
  child_poverty_pct_cut: number;
  baseline_poverty_count: number;
  reform_poverty_count: number;
  population: number;
  baseline_child_poverty_count: number;
  reform_child_poverty_count: number;
  child_population: number;
}

export interface DistrictResult {
  congressional_district_geoid: number;
  state_fips: number;
  state: string;
  reform_type: string;
  cost: number;
  poverty_pct_cut: number;
  child_poverty_pct_cut: number;
  baseline_poverty_count: number;
  reform_poverty_count: number;
  population: number;
  baseline_child_poverty_count: number;
  reform_child_poverty_count: number;
  child_population: number;
}

export type MetricKey = "cost" | "poverty_pct_cut" | "child_poverty_pct_cut";

export type ViewType = "state" | "district";

export interface MetricOption {
  label: string;
  key: MetricKey;
  format: "currency" | "percent";
}

export const METRICS: MetricOption[] = [
  { label: "Total Cost", key: "cost", format: "currency" },
  { label: "Poverty Reduction", key: "poverty_pct_cut", format: "percent" },
  {
    label: "Child Poverty Reduction",
    key: "child_poverty_pct_cut",
    format: "percent",
  },
];

export const REFORM_TYPES = ["CTCs", "EITCs", "CTCs and EITCs"];

export const SUPPORTED_YEARS = [2024, 2025, 2026] as const;
export type SupportedYear = (typeof SUPPORTED_YEARS)[number];

export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};
