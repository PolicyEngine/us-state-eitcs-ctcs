import streamlit as st
from policyengine_us import Simulation
import pandas as pd
import plotly.express as px
import pkg_resources


CTCS = [
    "ca_yctc", "co_ctc", "co_family_affordability_credit", "id_ctc", "md_ctc", "mn_child_and_working_families_credits","mt_ctc", "nc_ctc", "nj_ctc",
    "nm_ctc", "ny_ctc", "or_ctc", "vt_ctc"
]

EITCS = [
    "ca_eitc", "co_eitc", "ct_eitc", "dc_eitc", "de_eitc", "hi_eitc", "ia_eitc",
    "il_eitc", "in_eitc", "ks_total_eitc",
    "la_eitc", "ma_eitc", "md_eitc", "me_eitc", "mi_eitc", "mo_wftc",
    "mt_eitc", "ne_eitc", "nj_eitc", "nm_eitc", "ny_eitc", "oh_eitc",
    "ok_eitc", "or_eitc", "ri_eitc", "sc_eitc", "ut_eitc",
    "va_eitc", "vt_eitc",
    "wa_working_families_tax_credit", "wi_earned_income_credit"
]

class reform(Reform):
    def apply(self):
        for var in CTCS + EITCS:
            self.neutralize_variable(var)

@st.cache_data
def calculate_household_data():
    def calculate_data(state):
        situation = {
            "people": {
                "you": {
                    "age": {"2024": 40},
                    "employment_income": {"2024": 25000},
                },
                "your first dependent": {"age": {"2024": 2}},
                "your second dependent": {"age": {"2024": 4}},
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

        simulation = Simulation(situation=situation, reform=reform)
        net_income = float(simulation.calculate("household_net_income", 2024))
        benefits = float(simulation.calculate("household_benefits", 2024))
        refundable_credits = float(
            simulation.calculate("household_refundable_tax_credits", 2024)
        )
        tax_before_credits = float(
            simulation.calculate(
                "household_tax_before_refundable_credits", 2024
            )
        )

        return {
            "net_income": net_income,
            "benefits": benefits,
            "refundable_credits": refundable_credits,
            "tax_before_credits": tax_before_credits,
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


st.title("Household Financial Data by State (PRELIMINARY)")

st.markdown(
    """
The household consists of:
- A married couple, each age 40 with \$25,000 wages
- Two children, age 2 and 4
- Monthly expenses of \$2,000 for rent and \$500 for childcare
"""
)

household_data = calculate_household_data()

states = list(household_data.keys())
selected_state = st.selectbox(
    "Select a state for comparison:", states, index=states.index("VA")
)

df = pd.DataFrame(household_data).T.reset_index()
df.columns = [
    "State",
    "Net Income",
    "Benefits",
    "Refundable Credits",
    "Tax Before Credits",
]

reference_data = household_data[selected_state]
df["Net Income Difference"] = df["Net Income"] - reference_data["net_income"]
df["Benefits Difference"] = df["Benefits"] - reference_data["benefits"]
df["Refundable Credits Difference"] = (
    df["Refundable Credits"] - reference_data["refundable_credits"]
)
df["Tax Before Credits Difference"] = (
    df["Tax Before Credits"] - reference_data["tax_before_credits"]
)

fig = px.choropleth(
    df,
    locations="State",
    locationmode="USA-states",
    color="Net Income Difference",
    scope="usa",
    color_continuous_scale=px.colors.diverging.RdBu,
    color_continuous_midpoint=0,
    labels={"Net Income Difference": "Net Income Difference ($)"},
    title=f"Household Net Income Difference Compared to {selected_state}",
    hover_data={
        "State": True,
        "Net Income Difference": ":.2f",
        "Benefits Difference": ":.2f",
        "Refundable Credits Difference": ":.2f",
        "Tax Before Credits Difference": ":.2f",
    },
)

st.plotly_chart(fig)

policyengine_version = pkg_resources.get_distribution(
    "policyengine_us"
).version

st.markdown(
    """
Data and calculations provided by [PolicyEngine](https://policyengine.org/).

`policyengine-us` v{}
""".format(
        policyengine_version
    )
)