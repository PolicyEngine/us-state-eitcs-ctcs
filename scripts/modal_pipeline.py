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

# State-specific EITC variables (must neutralize individual state credits, not aggregates)
# The state_eitc aggregation variable doesn't propagate neutralization to individual credits
STATE_EITC_VARS = {
    "CA": ["ca_eitc"],
    "CO": ["co_eitc"],
    "CT": ["ct_eitc"],
    "DC": ["dc_eitc"],
    "DE": ["de_eitc"],
    "HI": ["hi_eitc"],
    "IA": ["ia_eitc"],
    "IL": ["il_eitc"],
    "IN": ["in_eitc"],
    "KS": ["ks_total_eitc"],  # Kansas uses combined refundable + non-refundable
    "LA": ["la_eitc"],
    "MA": ["ma_eitc"],
    "MD": ["md_refundable_eitc", "md_non_refundable_eitc"],  # MD has split EITC
    "ME": ["me_eitc"],
    "MI": ["mi_eitc"],
    "MO": ["mo_wftc"],  # Missouri Working Families Tax Credit
    "MT": ["mt_eitc"],
    "NE": ["ne_eitc"],
    "NJ": ["nj_eitc"],
    "NM": ["nm_eitc"],
    "NY": ["ny_eitc", "ny_supplemental_eitc"],  # NY has two EITC components
    "OH": ["oh_eitc"],
    "OK": ["ok_eitc"],
    "OR": ["or_eitc"],
    "PA": ["pa_eitc"],  # NEW in 2025
    "RI": ["ri_eitc"],
    "SC": ["sc_eitc"],
    "UT": ["ut_eitc"],
    "VA": ["va_non_refundable_eitc", "va_refundable_eitc"],  # VA has split EITC
    "VT": ["vt_eitc"],
    "WA": ["wa_working_families_tax_credit"],  # Washington uses different name
    "WI": ["wi_earned_income_credit"],  # Wisconsin uses different name
}

# State-specific CTC variables
STATE_CTC_VARS = {
    "AZ": ["az_dependent_tax_credit"],
    "CA": ["ca_yctc"],  # California Young Child Tax Credit
    "CO": ["co_ctc", "co_family_affordability_credit"],
    "CT": ["ct_child_tax_rebate"],
    "DC": ["dc_ctc"],  # NEW in 2026
    "GA": ["ga_ctc"],  # NEW in 2026
    "ID": ["id_ctc"],  # EXPIRES in 2026
    "IL": ["il_ctc"],
    "MA": ["ma_child_and_family_credit_or_dependent_care_credit"],
    "MD": ["md_ctc"],
    "ME": ["me_dependent_exemption_credit"],
    "MN": ["mn_child_and_working_families_credits"],  # Minnesota combined CTC
    "NE": ["ne_refundable_ctc"],
    "NJ": ["nj_ctc"],
    "NM": ["nm_ctc"],
    "NY": ["ny_ctc"],
    "OK": ["ok_child_care_child_tax_credit"],
    "OR": ["or_ctc"],
    "RI": ["ri_child_tax_rebate"],
    "UT": ["ut_ctc"],
    "VT": ["vt_ctc"],
}

# Year-specific exclusions - some programs don't exist in certain years
EITC_YEAR_EXCLUSIONS = {
    2024: ["PA"],  # PA EITC doesn't exist in 2024
}

CTC_YEAR_EXCLUSIONS = {
    2024: ["DC", "GA"],  # DC and GA CTC don't exist in 2024
    2025: ["DC", "GA"],  # DC and GA CTC don't exist in 2025
    2026: ["ID"],  # ID CTC expires in 2026
}

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
    if state in EITC_YEAR_EXCLUSIONS.get(year, []):
        state_eitc_vars = []
    else:
        state_eitc_vars = STATE_EITC_VARS.get(state, [])

    if state in CTC_YEAR_EXCLUSIONS.get(year, []):
        state_ctc_vars = []
    else:
        state_ctc_vars = STATE_CTC_VARS.get(state, [])

    print(f"  State credit variables: EITC={state_eitc_vars}, CTC={state_ctc_vars}")

    # Run reform simulations using state-specific variables
    reform_results = {}

    # Define reforms with state-specific variables
    reforms_to_run = [
        ("CTCs", state_ctc_vars),
        ("EITCs", state_eitc_vars),
        ("CTCs and EITCs", state_ctc_vars + state_eitc_vars),
    ]

    for reform_name, reform_vars in reforms_to_run:
        # Filter out empty variable lists - if no credits exist, skip neutralization
        valid_vars = [v for v in reform_vars if v]

        if not valid_vars:
            # No credits to neutralize for this state/reform type
            # Use baseline metrics (no change)
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
