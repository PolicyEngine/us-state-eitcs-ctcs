import streamlit as st
import pandas as pd
import plotly.express as px
import pkg_resources

# import household_impact


st.title("State EITC and CTC Impacts")

st.markdown(
    """
31 states have an Earned Income Tax Credit and 13 have a Child Tax Credit. This app shows how they compare in terms of cost, poverty, and inequality.
"""
)

data = pd.read_csv("results.csv")

states = data.state.unique()
policies = data.reform_type.unique()

# Filter data for "CTCs and EITCs"
# TODO: Make a selector.
selected_policy = st.selectbox("Select policy", policies)

# Metric selector for CTCs and EITCs
METRICS = {
    "Cost": "cost",
    "Poverty Reduction": "poverty_pct_cut",
    "Child Poverty Reduction": "child_poverty_pct_cut",
    "Poverty Gap Reduction": "poverty_gap_pct_cut",
    "Inequality Reduction": "gini_index_pct_cut",
}

# Rename columns for better display.
METRICS_RENAME = {
    "cost": "Cost",
    "poverty_pct_cut": "Poverty Reduction",
    "child_poverty_pct_cut": "Child Poverty Reduction",
    "poverty_gap_pct_cut": "Poverty Gap Reduction",
    "gini_index_pct_cut": "Inequality Reduction",
}
data.rename(columns=METRICS_RENAME, inplace=True)

selected_metric = st.selectbox("Select metric", list(METRICS.keys()))

filtered_data = data[data.reform_type == selected_policy]

fig = px.choropleth(
    filtered_data,
    locations="state",
    locationmode="USA-states",
    color=selected_metric,
    scope="usa",
    # Change to unidirectional colors.
    color_continuous_scale=px.colors.diverging.RdBu,
    color_continuous_midpoint=0,
    # labels=metrics_rev,
    # labels=METRICS, # Flip the dict.
    title=f"Impact of State {selected_policy} on {selected_metric}",
    hover_data={
        "state": True,
        "Cost": ":.2f",
        "Poverty Reduction": ":.2f",
        "Child Poverty Reduction": ":.2f",
        "Poverty Gap Reduction": ":.2f",
        "Inequality Reduction": ":.2f",
    },
)

st.plotly_chart(fig)

display_df = (
    filtered_data[["state", selected_metric]][filtered_data[selected_metric] != 0]
    .sort_values(selected_metric, ascending=False)
    .reset_index()
)

# Make it a rank by adding 1 to index.
display_df["rank"] = display_df.index + 1
display_df.drop(columns=["index"], inplace=True)

st.dataframe(display_df, hide_index=True)

policyengine_version = pkg_resources.get_distribution("policyengine_us").version

st.markdown(
    """
Data and calculations provided by [PolicyEngine](https://policyengine.org/).

`policyengine-us` v{}
""".format(
        policyengine_version
    )
)
