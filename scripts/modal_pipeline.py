"""
Modal pipeline for generating state EITC/CTC impact data.

This pipeline runs PolicyEngine microsimulations in parallel across all 51 states
(50 states + DC) to calculate the impacts of state-level earned income tax credits
and child tax credits on poverty, inequality, and household finances.

Usage:
    # Deploy and run the full pipeline
    modal run modal_pipeline.py::generate_all_state_impacts

    # Or deploy as a scheduled job
    modal deploy modal_pipeline.py
"""

import modal
import json
from pathlib import Path

# Define the Modal app
app = modal.App("state-eitc-ctc-impacts")

# Define the image with required dependencies
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "policyengine-us==1.633.2",  # Pin to specific version for reproducibility
    "pandas>=2.0.0",
    "numpy>=1.24.0",
)

# State configuration
STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL",
    "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
    "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
    "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
    "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
]

STATE_FIPS = {
    "AL": 1, "AK": 2, "AZ": 4, "AR": 5, "CA": 6, "CO": 8, "CT": 9,
    "DE": 10, "DC": 11, "FL": 12, "GA": 13, "HI": 15, "ID": 16,
    "IL": 17, "IN": 18, "IA": 19, "KS": 20, "KY": 21, "LA": 22,
    "ME": 23, "MD": 24, "MA": 25, "MI": 26, "MN": 27, "MS": 28,
    "MO": 29, "MT": 30, "NE": 31, "NV": 32, "NH": 33, "NJ": 34,
    "NM": 35, "NY": 36, "NC": 37, "ND": 38, "OH": 39, "OK": 40,
    "OR": 41, "PA": 42, "RI": 44, "SC": 45, "SD": 46, "TN": 47,
    "TX": 48, "UT": 49, "VT": 50, "VA": 51, "WA": 53, "WV": 54,
    "WI": 55, "WY": 56,
}

def get_state_credit_variables(state: str, year: int):
    """
    Get the EITC and CTC variables for a specific state and year.

    Uses policyengine-us parameters (gov.states.household.state_eitcs and state_ctcs)
    to get the official list of state credit variables, then filters by state.

    Args:
        state: Two-letter state code
        year: Tax year

    Returns:
        tuple: (eitc_vars list, ctc_vars list)
    """
    from policyengine_us import CountryTaxBenefitSystem

    system = CountryTaxBenefitSystem()
    params = system.parameters

    # Get the official list of state EITC and CTC variables from policyengine-us parameters
    # These are maintained in gov/states/household/state_eitcs.yaml and state_ctcs.yaml
    all_eitc_vars = params.gov.states.household.state_eitcs(f"{year}-01-01")
    all_ctc_vars = params.gov.states.household.state_ctcs(f"{year}-01-01")

    state_lower = state.lower()

    # Filter to only variables for this state (variables start with state code + underscore)
    eitc_vars = [v for v in all_eitc_vars if v.startswith(f"{state_lower}_")]
    ctc_vars = [v for v in all_ctc_vars if v.startswith(f"{state_lower}_")]

    # Minnesota combined its CTC and WFC into a single credit
    # (mn_child_and_working_families_credits). The legacy mn_wfc variable is not
    # used in the tax calculation. Replace with the combined credit and include
    # it in both EITC and CTC lists so the separate reforms reflect the impact.
    if state == "MN":
        combined = "mn_child_and_working_families_credits"
        eitc_vars = [combined]
        ctc_vars = [combined]

    return eitc_vars, ctc_vars

YEAR = 2025

# Volume for persisting results
volume = modal.Volume.from_name("state-eitc-ctc-results", create_if_missing=True)


@app.function(
    image=image,
    timeout=3600,  # 60 minutes per state (CA and NE need more time)
    memory=16384,  # 16GB RAM for larger states
    cpu=2.0,
)
def process_single_state(state: str, year: int = YEAR) -> list[dict]:
    """Process a single state and return district-level impacts."""
    import pandas as pd
    import numpy as np
    import gc
    from policyengine_us import Microsimulation
    from policyengine_core.reforms import Reform

    def create_reform(neutralized_variables):
        """Create a reform that neutralizes given variables."""
        class NeutralizeReform(Reform):
            def apply(self):
                for var in neutralized_variables:
                    self.neutralize_variable(var)
        return NeutralizeReform

    def create_mn_component_reform(component: str):
        """
        Create a parameter-based reform for Minnesota's combined credit.

        Minnesota combined its CTC and Working Family Credit into a single
        variable. To isolate components, we zero out the relevant parameters.

        component: "ctc" zeros the child tax credit portion,
                   "wfc" zeros the working family credit portion,
                   "both" neutralizes the entire combined variable.
        """
        def modifier(parameters):
            from policyengine_core.periods import instant
            start = instant("2020-01-01")
            stop = instant("2100-12-31")
            path = parameters.gov.states.mn.tax.income.credits.cwfc
            if component in ("ctc", "both"):
                path.ctc.amount.update(start=start, stop=stop, value=0)
            if component in ("wfc", "both"):
                for bracket in path.wfc.phase_in.brackets:
                    bracket.rate.update(start=start, stop=stop, value=0)
                for bracket in path.wfc.additional.amount.brackets:
                    bracket.amount.update(start=start, stop=stop, value=0)
            return parameters

        class MnComponentReform(Reform):
            def apply(self):
                self.modify_parameters(modifier_function=modifier)

        return MnComponentReform

    def safe_pct_change(baseline_val, reform_val):
        """Calculate percentage change safely."""
        if reform_val == 0 or np.isnan(reform_val):
            return 0
        return (baseline_val - reform_val) / reform_val

    def calculate_gini(incomes, weights):
        """Calculate Gini coefficient for weighted data."""
        if len(incomes) == 0 or weights.sum() == 0:
            return 0

        sorted_indices = np.argsort(incomes)
        sorted_incomes = incomes[sorted_indices]
        sorted_weights = weights[sorted_indices]

        cum_weights = np.cumsum(sorted_weights)
        cum_income = np.cumsum(sorted_incomes * sorted_weights)

        total_weight = cum_weights[-1]
        total_income = cum_income[-1]

        if total_income == 0:
            return 0

        cum_weights_norm = cum_weights / total_weight
        cum_income_norm = cum_income / total_income

        area_under = np.trapezoid(cum_income_norm, cum_weights_norm)
        gini = 1 - 2 * area_under

        return max(0, min(1, gini))

    def run_simulation(dataset, reform=None, year=year):
        """Run a single simulation and extract needed data."""
        if reform:
            sim = Microsimulation(reform=reform, dataset=dataset)
        else:
            sim = Microsimulation(dataset=dataset)

        # Use calculate_dataframe and convert to regular pandas DataFrame
        # to avoid microdf weight issues when filtering
        hh_data = pd.DataFrame(sim.calculate_dataframe(
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
        ))

        person_data = pd.DataFrame(sim.calculate_dataframe(
            [
                "person_id",
                "person_household_id",
                "person_weight",
                "in_poverty",
                "is_child",
            ],
            map_to="person",
            period=year,
        ))

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

            mask_hh = hh_data["congressional_district_geoid"] == district
            hh_ids = set(hh_data.loc[mask_hh, "household_id"].values)
            mask_person = person_data["person_household_id"].isin(hh_ids)

            hh_subset = hh_data.loc[mask_hh]

            net_income = (
                hh_subset["household_net_income"] * hh_subset["household_weight"]
            ).sum()

            poverty_gap = (hh_subset["poverty_gap"] * hh_subset["household_weight"]).sum()

            equiv_incomes = hh_subset["equiv_household_net_income"].values
            gini_weights = (
                hh_subset["household_weight"] * hh_subset["household_count_people"]
            ).values
            gini_index = calculate_gini(equiv_incomes, gini_weights)

            person_subset = person_data.loc[mask_person]
            total_person_weight = person_subset["person_weight"].sum()
            if total_person_weight > 0:
                poverty = (
                    person_subset["in_poverty"] * person_subset["person_weight"]
                ).sum() / total_person_weight
            else:
                poverty = 0

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

    print(f"Processing {state}...")

    dataset = f"hf://policyengine/policyengine-us-data/states/{state}.h5"
    state_fips = STATE_FIPS[state]

    # Run baseline simulation
    print(f"  Running baseline...")
    hh_baseline, person_baseline = run_simulation(dataset, year=year)
    districts = hh_baseline["congressional_district_geoid"].unique()
    baseline_metrics = calculate_district_metrics(hh_baseline, person_baseline, districts)

    # Debug: Check baseline net income for first district
    first_district = [d for d in districts if not pd.isna(d) and d != 0][0] if len(districts) > 0 else None
    if first_district:
        print(f"  DEBUG: Baseline net income for district {first_district}: {baseline_metrics.get(int(first_district), {}).get('net_income', 'N/A')}")

    del hh_baseline, person_baseline
    gc.collect()

    # Get state-specific credit variables to neutralize (respecting year exclusions)
    # Dynamically discover state credit variables from policyengine-us
    state_eitc_vars, state_ctc_vars = get_state_credit_variables(state, year)

    print(f"  State credit variables: EITC={state_eitc_vars}, CTC={state_ctc_vars}")

    reform_results = {}

    if state == "MN":
        reforms_to_run = [
            ("CTCs", create_mn_component_reform("ctc")),
            ("EITCs", create_mn_component_reform("wfc")),
            ("CTCs and EITCs", create_mn_component_reform("both")),
        ]
    else:
        reforms_to_run = [
            ("CTCs", state_ctc_vars),
            ("EITCs", state_eitc_vars),
            ("CTCs and EITCs", state_ctc_vars + state_eitc_vars),
        ]

    for reform_name, reform_spec in reforms_to_run:
        if state == "MN":
            reform = reform_spec
            print(f"  Running {reform_name} (MN parameter reform)...")
        else:
            valid_vars = [v for v in reform_spec if v]
            if not valid_vars:
                print(f"  Skipping {reform_name} neutralization (no applicable credits)")
                reform_results[reform_name] = baseline_metrics
                continue
            print(f"  Running {reform_name} neutralized (vars: {valid_vars})...")
            reform = create_reform(valid_vars)

        hh_reform, person_reform = run_simulation(dataset, reform=reform, year=year)
        reform_results[reform_name] = calculate_district_metrics(
            hh_reform, person_reform, districts
        )

        # Debug: Check reform net income for first district
        if first_district:
            reform_income = reform_results[reform_name].get(int(first_district), {}).get('net_income', 'N/A')
            baseline_income = baseline_metrics.get(int(first_district), {}).get('net_income', 'N/A')
            if isinstance(reform_income, (int, float)) and isinstance(baseline_income, (int, float)):
                diff = baseline_income - reform_income
                print(f"  DEBUG: {reform_name} district {first_district}: baseline={baseline_income:.0f}, reform={reform_income:.0f}, diff={diff:.0f}")

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

            cost = baseline["net_income"] - reform["net_income"]
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
                    "congressional_district_geoid": int(district),
                    "state_fips": state_fips,
                    "state": state,
                    "reform_type": reform_type,
                    "cost": float(cost),
                    "poverty_pct_cut": float(poverty_pct_cut),
                    "child_poverty_pct_cut": float(child_poverty_pct_cut),
                    "poverty_gap_pct_cut": float(poverty_gap_pct_cut),
                    "gini_index_pct_cut": float(gini_index_pct_cut),
                }
            )

    print(f"  Completed {state}: {len(results)} district-reform combinations")
    return results


@app.function(
    image=image,
    timeout=7200,  # 2 hours for full pipeline
    volumes={"/results": volume},
)
def generate_all_state_impacts(year: int = YEAR) -> dict:
    """
    Generate impact data for all states using parallel processing.

    Returns a dict with 'district_impacts' and 'state_impacts' keys.
    """
    import pandas as pd
    from datetime import datetime

    print("=" * 60)
    print(f"Generating CTC/EITC Impact Data for {year}")
    print(f"Processing {len(STATES)} states in parallel")
    print("=" * 60)

    # Process all states in parallel using Modal's map
    all_district_results = []

    # Use starmap to process states in parallel
    results = list(process_single_state.map(STATES, kwargs={"year": year}))

    for state_results in results:
        if state_results:
            all_district_results.extend(state_results)

    if not all_district_results:
        raise ValueError("No results generated!")

    # Create district-level dataframe
    district_df = pd.DataFrame(all_district_results)
    district_df = district_df.sort_values(
        ["state_fips", "congressional_district_geoid", "reform_type"]
    )

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
                    "child_poverty_pct_cut": reform_data["child_poverty_pct_cut"].mean(),
                    "poverty_gap_pct_cut": reform_data["poverty_gap_pct_cut"].mean(),
                    "gini_index_pct_cut": reform_data["gini_index_pct_cut"].mean(),
                }
            )

    state_df = pd.DataFrame(state_results)

    # Save to volume
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    district_df.to_csv(f"/results/district_impacts_{timestamp}.csv", index=False)
    state_df.to_csv(f"/results/state_impacts_{timestamp}.csv", index=False)

    # Also save as JSON for frontend
    state_json = state_df.to_dict(orient="records")
    with open(f"/results/results_{timestamp}.json", "w") as f:
        json.dump(state_json, f, indent=2)

    # Save latest versions
    district_df.to_csv("/results/district_impacts_latest.csv", index=False)
    state_df.to_csv("/results/state_impacts_latest.csv", index=False)
    with open("/results/results_latest.json", "w") as f:
        json.dump(state_json, f, indent=2)

    volume.commit()

    print("\n" + "=" * 60)
    print("Data generation complete!")
    print(f"District-level results: {len(district_df)} rows")
    print(f"State-level results: {len(state_df)} rows")
    print("=" * 60)

    return {
        "district_impacts": district_df.to_dict(orient="records"),
        "state_impacts": state_json,
        "timestamp": timestamp,
    }


@app.function(
    image=image,
    volumes={"/results": volume},
)
def get_latest_results() -> dict:
    """Retrieve the latest results from the volume."""
    results_path = Path("/results/results_latest.json")

    if not results_path.exists():
        return {"error": "No results found. Run generate_all_state_impacts first."}

    with open(results_path) as f:
        state_impacts = json.load(f)

    return {"state_impacts": state_impacts}


@app.function(
    image=image,
    volumes={"/results": volume},
    schedule=modal.Cron("0 0 1 * *"),  # Run on the 1st of each month at midnight
)
def scheduled_update():
    """Scheduled job to update the data monthly."""
    print("Running scheduled data update...")
    result = generate_all_state_impacts.remote()
    print(f"Update complete. Generated {len(result['state_impacts'])} state results.")
    return result


@app.local_entrypoint()
def main(year: int = 2025, get_results: bool = False):
    """Local entrypoint for running the pipeline."""
    if get_results:
        results = get_latest_results.remote()
        if "error" in results:
            print(results["error"])
        else:
            print(json.dumps(results["state_impacts"], indent=2))
    else:
        results = generate_all_state_impacts.remote(year=year)
        print(f"\nGenerated {len(results['state_impacts'])} state impact records")
        print(f"Timestamp: {results['timestamp']}")

        # Print summary
        print("\nState Impact Summary (CTCs and EITCs combined):")
        for item in results["state_impacts"]:
            if item["reform_type"] == "CTCs and EITCs" and item["cost"] > 0:
                print(f"  {item['state']}: ${item['cost']:,.0f} cost, "
                      f"{item['poverty_pct_cut']*100:.1f}% poverty reduction")
