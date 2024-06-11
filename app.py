import streamlit as st
import pandas as pd
import plotly.express as px
import pkg_resources

# import household_impact


st.title("State EITCs and CTCs")

data = pd.read_csv("results.csv")


states = data.state.unique()

# Filter data for "CTCs and EITCs"
# TODO: Make a selector.
filtered_data = data[data["reform_type"] == "CTCs and EITCs"]

# Metric selector for CTCs and EITCs
METRICS = {
    "Cost ($M)": "net_income_diff",
    "Poverty Percentage Difference (%)": "poverty_pct_diff",
    "Child Poverty Percentage Difference (%)": "child_poverty_pct_diff",
    "Poverty Gap Percentage Difference (%)": "poverty_gap_pct_diff",
    "Gini Index Percentage Difference (%)": "gini_index_pct_diff",
}

selected_metric = st.selectbox("Select Metric", list(METRICS.keys()))
metric_column = METRICS[selected_metric]

st.markdown(
    """
This visualization shows the impact of state CTCs and EITCs based on cost, poverty, and inequality metrics by state.
"""
)

fig = px.choropleth(
    filtered_data,
    locations="state",
    locationmode="USA-states",
    color=metric_column,
    scope="usa",
    color_continuous_scale=px.colors.diverging.RdBu,
    color_continuous_midpoint=0,
    labels={metric_column: selected_metric},
    title=f"CTCs and EITCs Impact Compared ({selected_metric})",
    hover_data={
        "state": True,
        "net_income_diff": ":.2f",
        "poverty_pct_diff": ":.2f",
        "child_poverty_pct_diff": ":.2f",
        "poverty_gap_pct_diff": ":.2f",
        "gini_index_pct_diff": ":.2f",
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
