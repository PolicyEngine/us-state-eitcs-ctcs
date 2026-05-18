"use client";

import dynamic from "next/dynamic";
import type { SweepPoint } from "../api/policyengine";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface Props {
  data: SweepPoint[];
  currentEarnings: number;
}

const PE_LOGO_URL =
  "https://raw.githubusercontent.com/PolicyEngine/policyengine-app-v2/main/app/public/assets/logos/policyengine/teal.png";

const PE_FONT = "Inter, system-ui, -apple-system, sans-serif";

const series = [
  { key: "federalEitc" as const, name: "Federal EITC", color: "#319795" },
  { key: "federalCtc" as const, name: "Federal CTC", color: "#285E61" },
  { key: "stateEitc" as const, name: "State EITC", color: "#0EA5E9" },
  { key: "stateCtc" as const, name: "State CTC", color: "#026AA2" },
];

const MARKER_COLOR = "#6B7280";

export default function CreditsChart({ data, currentEarnings }: Props) {
  const x = data.map((d) => d.earnings);

  const traces = series.map((s) => ({
    x,
    y: data.map((d) => d[s.key]),
    type: "scatter" as const,
    mode: "lines" as const,
    name: s.name,
    line: { color: s.color, width: 2.5, shape: "spline" as const },
    hovertemplate: `<b>${s.name}</b>: $%{y:,.0f}<extra></extra>`,
  }));

  return (
    <Plot
      data={traces}
      layout={{
        title: {
          text: "Credits by earnings",
          font: { family: PE_FONT, size: 18, color: "#000000" },
          x: 0,
          xanchor: "left",
        },
        font: { family: PE_FONT, color: "#000000", size: 14 },
        autosize: true,
        height: 420,
        margin: { l: 70, r: 40, t: 60, b: 90 },
        paper_bgcolor: "#FFFFFF",
        plot_bgcolor: "#FFFFFF",
        template: "plotly_white" as unknown as undefined,
        xaxis: {
          title: {
            text: "Annual earnings",
            font: { family: PE_FONT, size: 14, color: "#000000" },
            standoff: 12,
          },
          tickformat: "$,.0f",
          gridcolor: "#E2E8F0",
          zerolinecolor: "#E2E8F0",
          tickfont: { family: PE_FONT, size: 12, color: "#5A5A5A" },
          showline: true,
          linecolor: "#E2E8F0",
        },
        yaxis: {
          title: {
            text: "Credit amount",
            font: { family: PE_FONT, size: 14, color: "#000000" },
            standoff: 12,
          },
          tickformat: "$,.0f",
          gridcolor: "#E2E8F0",
          zerolinecolor: "#E2E8F0",
          tickfont: { family: PE_FONT, size: 12, color: "#5A5A5A" },
          rangemode: "tozero",
          showline: true,
          linecolor: "#E2E8F0",
        },
        legend: {
          orientation: "h",
          y: 1.08,
          x: 1,
          xanchor: "right",
          font: { family: PE_FONT, size: 12, color: "#000000" },
          bgcolor: "rgba(0,0,0,0)",
        },
        hovermode: "x unified",
        hoverlabel: {
          bgcolor: "#FFFFFF",
          bordercolor: "#E2E8F0",
          font: { family: PE_FONT, size: 12, color: "#000000" },
        },
        modebar: {
          bgcolor: "rgba(0,0,0,0)",
          color: "rgba(0,0,0,0)",
        },
        shapes: [
          {
            type: "line",
            x0: currentEarnings,
            x1: currentEarnings,
            yref: "paper",
            y0: 0,
            y1: 1,
            line: { color: MARKER_COLOR, width: 1.5, dash: "dash" },
          },
        ],
        annotations: [
          {
            x: currentEarnings,
            yref: "paper",
            y: 1.04,
            text: `Your earnings: $${currentEarnings.toLocaleString()}`,
            showarrow: false,
            font: { family: PE_FONT, size: 12, color: MARKER_COLOR },
            xanchor: "left",
          },
        ],
        images: [
          {
            source: PE_LOGO_URL,
            xref: "paper",
            yref: "paper",
            x: 1,
            y: -0.18,
            sizex: 0.14,
            sizey: 0.14,
            xanchor: "right",
            yanchor: "bottom",
            opacity: 0.85,
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
