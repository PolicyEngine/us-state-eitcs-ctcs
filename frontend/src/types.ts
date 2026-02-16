export interface StateResult {
  state: string;
  reform_type: string;
  cost: number;
  poverty_pct_cut: number;
  child_poverty_pct_cut: number;
  poverty_gap_pct_cut: number;
  gini_index_pct_cut: number;
}

export type MetricKey =
  | "cost"
  | "poverty_pct_cut"
  | "child_poverty_pct_cut"
  | "poverty_gap_pct_cut"
  | "gini_index_pct_cut";

export interface MetricOption {
  label: string;
  key: MetricKey;
}

export const METRICS: MetricOption[] = [
  { label: "Cost", key: "cost" },
  { label: "Poverty reduction", key: "poverty_pct_cut" },
  { label: "Child poverty reduction", key: "child_poverty_pct_cut" },
  { label: "Poverty gap reduction", key: "poverty_gap_pct_cut" },
  { label: "Inequality reduction", key: "gini_index_pct_cut" },
];

export const REFORM_TYPES = [
  "CTCs",
  "EITCs",
  "CTCs and EITCs",
  "State income tax",
];

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
