"""
Generate CTC/EITC impact data by state and congressional district.
Uses state-specific datasets for efficiency.
Memory-optimized version that processes one simulation at a time.
Includes: cost, poverty, child poverty, poverty gap, and Gini index.

Uses PolicyEngine's state_ctc and state_eitc aggregated variables
which automatically include all relevant state credits.
"""

import pandas as pd
import numpy as np
import gc
from policyengine_us import Microsimulation
from policyengine_core.reforms import Reform


STATES = [
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DE",
    "DC",
    "FL",
    "GA",
    "HI",
    "ID",
    "IL",
    "IN",
    "IA",
    "KS",
    "KY",
    "LA",
    "ME",
    "MD",
    "MA",
    "MI",
    "MN",
    "MS",
    "MO",
    "MT",
    "NE",
    "NV",
    "NH",
    "NJ",
    "NM",
    "NY",
    "NC",
    "ND",
    "OH",
    "OK",
    "OR",
    "PA",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VT",
    "VA",
    "WA",
    "WV",
    "WI",
    "WY",
]

STATE_FIPS = {
    "AL": 1,
    "AK": 2,
    "AZ": 4,
    "AR": 5,
    "CA": 6,
    "CO": 8,
    "CT": 9,
    "DE": 10,
    "DC": 11,
    "FL": 12,
    "GA": 13,
    "HI": 15,
    "ID": 16,
    "IL": 17,
    "IN": 18,
    "IA": 19,
    "KS": 20,
    "KY": 21,
    "LA": 22,
    "ME": 23,
    "MD": 24,
    "MA": 25,
    "MI": 26,
    "MN": 27,
    "MS": 28,
    "MO": 29,
    "MT": 30,
    "NE": 31,
    "NV": 32,
    "NH": 33,
    "NJ": 34,
    "NM": 35,
    "NY": 36,
    "NC": 37,
    "ND": 38,
    "OH": 39,
    "OK": 40,
    "OR": 41,
    "PA": 42,
    "RI": 44,
    "SC": 45,
    "SD": 46,
    "TN": 47,
    "TX": 48,
    "UT": 49,
    "VT": 50,
    "VA": 51,
    "WA": 53,
    "WV": 54,
    "WI": 55,
    "WY": 56,
}

# Use PolicyEngine's aggregated variables - these automatically include all state credits
# state_ctc: aggregates all state child tax credits (defined in gov.states.household.state_ctcs)
# state_eitc: aggregates all state earned income tax credits (defined in gov.states.household.state_eitcs)
STATE_CTC_VAR = "state_ctc"
STATE_EITC_VAR = "state_eitc"

YEAR = 2025


def create_reform(neutralized_variables):
    """Create a reform that neutralizes given variables."""

    class NeutralizeReform(Reform):
        def apply(self):
            for var in neutralized_variables:
                self.neutralize_variable(var)

    return NeutralizeReform


def safe_pct_change(baseline_val, reform_val):
    """Calculate percentage change safely."""
    if reform_val == 0 or np.isnan(reform_val):
        return 0
    return (baseline_val - reform_val) / reform_val


def calculate_gini(incomes, weights):
    """Calculate Gini coefficient for weighted data."""
    if len(incomes) == 0 or weights.sum() == 0:
        return 0

    # Sort by income
    sorted_indices = np.argsort(incomes)
    sorted_incomes = incomes[sorted_indices]
    sorted_weights = weights[sorted_indices]

    # Cumulative weights and income
    cum_weights = np.cumsum(sorted_weights)
    cum_income = np.cumsum(sorted_incomes * sorted_weights)

    total_weight = cum_weights[-1]
    total_income = cum_income[-1]

    if total_income == 0:
        return 0

    # Calculate Gini using trapezoidal rule
    cum_weights_norm = cum_weights / total_weight
    cum_income_norm = cum_income / total_income

    # Area under Lorenz curve
    area_under = np.trapz(cum_income_norm, cum_weights_norm)

    # Gini = 1 - 2 * area under Lorenz curve
    gini = 1 - 2 * area_under

    return max(0, min(1, gini))  # Clamp between 0 and 1


def run_simulation(dataset, reform=None, year=YEAR):
    """Run a single simulation and extract needed data, then clean up."""
    if reform:
        sim = Microsimulation(reform=reform, dataset=dataset)
    else:
        sim = Microsimulation(dataset=dataset)

    # Extract household data including poverty gap and equiv income
    hh_data = sim.calculate_dataframe(
        [
            "household_id",
            "household_weight",
            "congressional_district_geoid",
            "household_net_income",
            "poverty_gap",
            "equiv_household_net_income",
            "household_count_people",
        ],
        map_to="household",
        period=year,
    )

    # Extract person data
    person_data = sim.calculate_dataframe(
        [
            "person_id",
            "person_household_id",
            "person_weight",
            "in_poverty",
            "is_child",
        ],
        map_to="person",
        period=year,
    )

    # Explicitly delete simulation to free memory
    del sim
    gc.collect()

    return hh_data, person_data


def calculate_district_metrics(hh_data, person_data, districts):
    """Calculate metrics for each district from simulation data."""
    results = {}

    for district in districts:
        if pd.isna(district) or district == 0:
            continue

        district = int(district)

        # Filter household data
        mask_hh = hh_data["congressional_district_geoid"] == district
        hh_ids = set(hh_data.loc[mask_hh, "household_id"].values)

        # Filter person data
        mask_person = person_data["person_household_id"].isin(hh_ids)

        # Household subset
        hh_subset = hh_data.loc[mask_hh]

        # Calculate weighted net income
        net_income = (
            hh_subset["household_net_income"] * hh_subset["household_weight"]
        ).sum()

        # Calculate weighted poverty gap
        poverty_gap = (hh_subset["poverty_gap"] * hh_subset["household_weight"]).sum()

        # Calculate Gini index (weighted by household size)
        equiv_incomes = hh_subset["equiv_household_net_income"].values
        gini_weights = (
            hh_subset["household_weight"] * hh_subset["household_count_people"]
        ).values
        gini_index = calculate_gini(equiv_incomes, gini_weights)

        # Calculate weighted poverty rate
        person_subset = person_data.loc[mask_person]
        total_person_weight = person_subset["person_weight"].sum()
        if total_person_weight > 0:
            poverty = (
                person_subset["in_poverty"] * person_subset["person_weight"]
            ).sum() / total_person_weight
        else:
            poverty = 0

        # Calculate child poverty rate
        children = person_subset[person_subset["is_child"] == True]
        total_child_weight = children["person_weight"].sum()
        if total_child_weight > 0:
            child_poverty = (
                children["in_poverty"] * children["person_weight"]
            ).sum() / total_child_weight
        else:
            child_poverty = 0

        results[district] = {
            "net_income": net_income,
            "poverty": poverty,
            "child_poverty": child_poverty,
            "poverty_gap": poverty_gap,
            "gini_index": gini_index,
        }

    return results


def process_state(state, year=YEAR):
    """Process a single state and return district-level impacts."""
    print(f"  Processing {state}...")

    dataset = f"hf://policyengine/policyengine-us-data/states/{state}.h5"
    state_fips = STATE_FIPS[state]

    # Run baseline simulation
    print(f"    Running baseline...")
    hh_baseline, person_baseline = run_simulation(dataset, year=year)
    districts = hh_baseline["congressional_district_geoid"].unique()
    baseline_metrics = calculate_district_metrics(
        hh_baseline, person_baseline, districts
    )

    # Clean up baseline data
    del hh_baseline, person_baseline
    gc.collect()

    # Run reform simulations one at a time
    # Using aggregated state_ctc and state_eitc variables which automatically
    # include all relevant credits for each state
    reform_results = {}

    for reform_name, reform_vars in [
        ("CTCs", [STATE_CTC_VAR]),
        ("EITCs", [STATE_EITC_VAR]),
        ("CTCs and EITCs", [STATE_CTC_VAR, STATE_EITC_VAR]),
    ]:
        print(f"    Running {reform_name} neutralized...")
        reform = create_reform(reform_vars)
        hh_reform, person_reform = run_simulation(dataset, reform=reform, year=year)
        reform_results[reform_name] = calculate_district_metrics(
            hh_reform, person_reform, districts
        )

        # Clean up
        del hh_reform, person_reform
        gc.collect()

    # Calculate impacts
    results = []
    for district in baseline_metrics:
        baseline = baseline_metrics[district]

        for reform_type, reform_metrics in reform_results.items():
            if district not in reform_metrics:
                continue

            reform = reform_metrics[district]

            # Cost = baseline - reform (positive means credit costs money)
            cost = baseline["net_income"] - reform["net_income"]

            # Poverty reduction (positive = good, credit reduces poverty)
            poverty_pct_cut = -safe_pct_change(baseline["poverty"], reform["poverty"])
            child_poverty_pct_cut = -safe_pct_change(
                baseline["child_poverty"], reform["child_poverty"]
            )
            poverty_gap_pct_cut = -safe_pct_change(
                baseline["poverty_gap"], reform["poverty_gap"]
            )
            gini_index_pct_cut = -safe_pct_change(
                baseline["gini_index"], reform["gini_index"]
            )

            results.append(
                {
                    "congressional_district_geoid": district,
                    "state_fips": state_fips,
                    "state": state,
                    "reform_type": reform_type,
                    "cost": cost,
                    "poverty_pct_cut": poverty_pct_cut,
                    "child_poverty_pct_cut": child_poverty_pct_cut,
                    "poverty_gap_pct_cut": poverty_gap_pct_cut,
                    "gini_index_pct_cut": gini_index_pct_cut,
                }
            )

    return results


def generate_all_data():
    """Generate impact data for all states."""
    print("=" * 60)
    print("Generating CTC/EITC Impact Data for 2025")
    print("Using state-specific datasets (memory optimized)")
    print("Metrics: cost, poverty, child poverty, poverty gap, Gini")
    print("=" * 60)

    all_results = []

    for i, state in enumerate(STATES):
        print(f"\n[{i+1}/{len(STATES)}] {state}")
        try:
            state_results = process_state(state)
            all_results.extend(state_results)
            print(f"    -> {len(state_results)} district-reform combinations")

            # Force garbage collection between states
            gc.collect()
        except Exception as e:
            print(f"    ERROR processing {state}: {e}")
            import traceback

            traceback.print_exc()
            continue

    if not all_results:
        print("ERROR: No results generated!")
        return None, None

    # Create district-level dataframe
    district_df = pd.DataFrame(all_results)
    district_df = district_df.sort_values(
        ["state_fips", "congressional_district_geoid", "reform_type"]
    )
    district_df.to_csv("data/district_impacts.csv", index=False)
    print(f"\nSaved district data: {len(district_df)} rows")

    # Aggregate to state level
    state_results = []
    for state in district_df["state"].unique():
        state_data = district_df[district_df["state"] == state]

        for reform_type in ["CTCs", "EITCs", "CTCs and EITCs"]:
            reform_data = state_data[state_data["reform_type"] == reform_type]

            if len(reform_data) == 0:
                continue

            state_results.append(
                {
                    "state": state,
                    "reform_type": reform_type,
                    "cost": reform_data["cost"].sum(),
                    "poverty_pct_cut": reform_data["poverty_pct_cut"].mean(),
                    "child_poverty_pct_cut": reform_data[
                        "child_poverty_pct_cut"
                    ].mean(),
                    "poverty_gap_pct_cut": reform_data["poverty_gap_pct_cut"].mean(),
                    "gini_index_pct_cut": reform_data["gini_index_pct_cut"].mean(),
                }
            )

    state_df = pd.DataFrame(state_results)
    state_df.to_csv("data/state_impacts.csv", index=False)
    print(f"Saved state data: {len(state_df)} rows")

    print("\n" + "=" * 60)
    print("Data generation complete!")
    print("=" * 60)

    return district_df, state_df


if __name__ == "__main__":
    generate_all_data()
