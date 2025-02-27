import Simulation
from policyengine_core.reforms import Reform
import pandas as pd
import streamlit as st  # Should remove these bits.


# Pull from a common module.
CTCS = [
    "ca_yctc",
    "co_ctc",
    "co_family_affordability_credit",
    "id_ctc",
    "md_ctc",
    "mn_child_and_working_families_credits",
    "mt_ctc",
    "nc_ctc",
    "nj_ctc",
    "nm_ctc",
    "ny_ctc",
    "or_ctc",
    "vt_ctc",
]

EITCS = [
    "ca_eitc",
    "co_eitc",
    "ct_eitc",
    "dc_eitc",
    "de_eitc",
    "hi_eitc",
    "ia_eitc",
    "il_eitc",
    "in_eitc",
    "ks_total_eitc",
    "la_eitc",
    "ma_eitc",
    "md_eitc",
    "me_eitc",
    "mi_eitc",
    "mo_wftc",
    "mt_eitc",
    "ne_eitc",
    "nj_eitc",
    "nm_eitc",
    "ny_eitc",
    "oh_eitc",
    "ok_eitc",
    "or_eitc",
    "ri_eitc",
    "sc_eitc",
    "ut_eitc",
    "va_eitc",
    "vt_eitc",
    "wa_working_families_tax_credit",
    "wi_earned_income_credit",
]


class reform(Reform):
    def apply(self):
        for var in CTCS + EITCS:
            self.neutralize_variable(var)


st.markdown(
    """
The household consists of:
- A single parent, age 40 with \$20,000 wages
- Two children, age 10 and 5
"""
)


@st.cache_data
def calculate_household_data():
    def calculate_data(state):
        situation = {
            "people": {
                "you": {
                    "age": {"2024": 40},
                    "employment_income": {"2024": 20000},
                },
                "your first dependent": {"age": {"2024": 10}},
                "your second dependent": {"age": {"2024": 5}},
            },
            "families": {
                "your family": {
                    "members": [
                        "you",
                        "your first dependent",
                        "your second dependent",
                    ]
                }
            },
            "marital_units": {
                "your marital unit": {"members": ["you"]},
                "your first dependent's marital unit": {
                    "members": ["your first dependent"],
                    "marital_unit_id": {"2024": 1},
                },
                "your second dependent's marital unit": {
                    "members": ["your second dependent"],
                    "marital_unit_id": {"2024": 2},
                },
            },
            "tax_units": {
                "your tax unit": {
                    "members": [
                        "you",
                        "your first dependent",
                        "your second dependent",
                    ]
                }
            },
            "spm_units": {
                "your household": {
                    "members": [
                        "you",
                        "your first dependent",
                        "your second dependent",
                    ],
                }
            },
            "households": {
                "your household": {
                    "members": [
                        "you",
                        "your first dependent",
                        "your second dependent",
                    ],
                    "state_name": {"2024": state},
                }
            },
        }

        baseline = Simulation(situation=situation)
        simulation = Simulation(situation=situation, reform=reform)
        baseline_net_income = float(baseline.calculate("household_net_income", 2024))
        reform_net_income = float(simulation.calculate("household_net_income", 2024))
        net_income_change = baseline_net_income - reform_net_income

        baseline_ctc = sum([float(baseline.calculate(var, 2024)[0]) for var in CTCS])
        reform_ctc = sum([float(simulation.calculate(var, 2024)[0]) for var in CTCS])
        ctc_impact = baseline_ctc - reform_ctc

        baseline_eitc = sum([float(baseline.calculate(var, 2024)[0]) for var in EITCS])
        reform_eitc = sum([float(simulation.calculate(var, 2024)[0]) for var in EITCS])
        eitc_impact = baseline_eitc - reform_eitc

        return {
            "net_income_change": net_income_change,
            "ctc_total": ctc_impact,
            "eitc_total": eitc_impact,
        }

    states = [
        "AL",
        "AK",
        "AZ",
        "AR",
        "CA",
        "CO",
        "CT",
        "DE",
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

    household_data = {}
    progress_bar = st.progress(0)
    status_text = st.empty()

    for i, state in enumerate(states):
        household_data[state] = calculate_data(state)
        progress = (i + 1) / len(states)
        progress_bar.progress(progress)
        status_text.text(f"Calculating data for state: {state}")

    progress_bar.empty()
    status_text.empty()

    return household_data


household_data = calculate_household_data()

states = list(household_data.keys())


df = pd.DataFrame(household_data).T.reset_index()
df.columns = [
    "State",
    "Net Income Change",
    "CTC Total",
    "EITC Total",
]
