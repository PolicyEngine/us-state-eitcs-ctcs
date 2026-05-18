"use client";

import dynamic from "next/dynamic";
import type { SweepPoint } from "../api/policyengine";
import { colors } from "../designTokens";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface Props {
  data: SweepPoint[];
  currentEarnings: number;
}

const palette = {
  fedEitc: colors.primary,        // teal 600-ish
  fedCtc: "#2C7A7B",              // PolicyEngine darker teal
  stateEitc: "#3182CE",           // policy positive blue
  stateCtc: "#805AD5",            // purple accent
  marker: "#475569",              // slate-600
};

export default function CreditsChart({ data, currentEarnings }: Props) {
  const x = data.map((d) => d.earnings);
  const series = [
    { name: "Federal EITC", y: data.map((d) => d.federalEitc), color: palette.fedEitc },
    { name: "Federal CTC", y: data.map((d) => d.federalCtc), color: palette.fedCtc },
    { name: "State EITC", y: data.map((d) => d.stateEitc), color: palette.stateEitc },
    { name: "State CTC", y: data.map((d) => d.stateCtc), color: palette.stateCtc },
  ];

  const traces = series.map((s) => ({
    x,
    y: s.y,
    type: "scatter" as const,
    mode: "lines" as const,
    name: s.name,
    line: { color: s.color, width: 2.5, shape: "spline" as const },
    hovertemplate: `<b>${s.name}</b><br>Earnings: $%{x:,.0f}<br>Credit: $%{y:,.0f}<extra></extra>`,
  }));

  return (
    <Plot
      data={traces}
      layout={{
        title: {
          text: "Credits by earnings",
          font: { family: "Inter, sans-serif", size: 16, color: "#1A202C" },
          x: 0.02,
        },
        autosize: true,
        height: 360,
        margin: { l: 64, r: 16, t: 48, b: 56 },
        xaxis: {
          title: { text: "Annual earnings", font: { family: "Inter, sans-serif", size: 12, color: "#64748b" } },
          tickformat: "$,.0f",
          gridcolor: "#e2e8f0",
          zerolinecolor: "#cbd5e1",
          tickfont: { family: "Inter, sans-serif", size: 11, color: "#64748b" },
        },
        yaxis: {
          title: { text: "Credit amount", font: { family: "Inter, sans-serif", size: 12, color: "#64748b" } },
          tickformat: "$,.0f",
          gridcolor: "#e2e8f0",
          zerolinecolor: "#cbd5e1",
          tickfont: { family: "Inter, sans-serif", size: 11, color: "#64748b" },
          rangemode: "tozero",
        },
        legend: {
          orientation: "h",
          y: -0.2,
          x: 0,
          font: { family: "Inter, sans-serif", size: 12, color: "#334155" },
        },
        hovermode: "x unified",
        hoverlabel: {
          bgcolor: "white",
          bordercolor: "#e2e8f0",
          font: { family: "Inter, sans-serif", size: 12, color: "#1A202C" },
        },
        paper_bgcolor: "white",
        plot_bgcolor: "white",
        shapes: [
          {
            type: "line",
            x0: currentEarnings,
            x1: currentEarnings,
            yref: "paper",
            y0: 0,
            y1: 1,
            line: { color: palette.marker, width: 1.5, dash: "dash" },
          },
        ],
        annotations: [
          {
            x: currentEarnings,
            yref: "paper",
            y: 1.02,
            text: `Your earnings: $${currentEarnings.toLocaleString()}`,
            showarrow: false,
            font: { family: "Inter, sans-serif", size: 11, color: palette.marker },
            xanchor: "left",
          },
        ],
      }}
      config={{
        displayModeBar: false,
        responsive: true,
      }}
      style={{ width: "100%" }}
      useResizeHandler
    />
  );
}
