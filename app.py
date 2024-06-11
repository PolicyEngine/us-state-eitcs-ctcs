import streamlit as st
import pandas as pd
import plotly.express as px
import pkg_resources

# import household_impact


st.title("State EITCs and CTCs")

st.markdown(
    """
31 states have an Earned Income Tax Credit and 12 have a Child Tax Credit. This app shows how they compare in terms of cost, poverty, and inequality.
"""
)

data = pd.read_csv("results.csv")

states = data.state.unique()
policies = data.reform_type.unique()

# Filter data for "CTCs and EITCs"
# TODO: Make a selector.
selected_policy = st.selectbox("Select Policy", policies)

# Metric selector for CTCs and EITCs
METRICS = {
    "Cost ($M)": "cost",
    "Poverty Percentage Difference (%)": "poverty_pct_cut",
    "Child Poverty Percentage Difference (%)": "child_poverty_pct_cut",
    "Poverty Gap Percentage Difference (%)": "poverty_gap_pct_cut",
    "Gini Index Percentage Difference (%)": "gini_index_pct_cut",
}

selected_metric = st.selectbox("Select Metric", list(METRICS.keys()))
metric_column = METRICS[selected_metric]

filtered_data = data[data.reform_type == selected_policy]

fig = px.choropleth(
    filtered_data,
    locations="state",
    locationmode="USA-states",
    color=metric_column,
    scope="usa",
    # Change to unidirectional colors.
    color_continuous_scale=px.colors.diverging.RdBu,
    color_continuous_midpoint=0,
    # labels=metrics_rev,
    # labels=METRICS, # Flip the dict.
    title=f"CTCs and EITCs Impact Compared ({selected_metric})",
    hover_data={
        "state": True,
        # Change to percentages.
        "cost": ":.2f",
        "poverty_pct_cut": ":.2f",
        "child_poverty_pct_cut": ":.2f",
        "poverty_gap_pct_cut": ":.2f",
        "gini_index_pct_cut": ":.2f",
    },
)

st.plotly_chart(fig)

st.table(
    filtered_data[["state", metric_column]][
        filtered_data[metric_column] != 0
    ].sort_values(metric_column, ascending=False)
)

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
