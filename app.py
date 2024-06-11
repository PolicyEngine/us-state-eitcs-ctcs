import streamlit as st
from policyengine_us import Simulation
import pandas as pd
import plotly.express as px
import pkg_resources


@st.cache_data
def calculate_household_data():
    def calculate_data(state):
        situation = {
            "people": {
                "you": {
                    "age": {"2024": 40},
                    "employment_income": {"2024": 25000},
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
                    ]                
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

        simulation = Simulation(situation=situation)
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
