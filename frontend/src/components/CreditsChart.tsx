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

function interpolate(
  xs: number[],
  ys: number[],
  x: number,
): number {
  if (xs.length === 0) return 0;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  for (let i = 1; i < xs.length; i++) {
    if (xs[i] >= x) {
      const t = (x - xs[i - 1]) / (xs[i] - xs[i - 1] || 1);
      return ys[i - 1] + t * (ys[i] - ys[i - 1]);
    }
  }
  return ys[ys.length - 1];
}

export default function CreditsChart({ data, currentEarnings }: Props) {
  const x = data.map((d) => d.earnings);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const traces: any[] = [];
  series.forEach((s) => {
    const ys = data.map((d) => d[s.key]);
    traces.push({
      x,
      y: ys,
      type: "scatter",
      mode: "lines",
      name: s.name,
      line: { color: s.color, width: 2, shape: "linear" },
      hovertemplate:
        `<b>${s.name}</b><br>` +
        `If you earn $%{x:,.0f}, your ${s.name} is $%{y:,.0f}.` +
        `<extra></extra>`,
    });
    traces.push({
      x: [currentEarnings],
      y: [interpolate(x, ys, currentEarnings)],
      type: "scatter",
      mode: "markers",
      marker: { color: s.color, size: 9, line: { color: "white", width: 1.5 } },
      showlegend: false,
      hovertemplate:
        `<b>Your ${s.name}</b><br>` +
        `If you earn $%{x:,.0f}, your ${s.name} is $%{y:,.0f}.` +
        `<extra></extra>`,
    });
  });

  return (
    <Plot
      data={traces}
      layout={{
        font: { family: PE_FONT, color: "#000000", size: 14 },
        autosize: true,
        height: 420,
        margin: { l: 70, r: 30, t: 8, b: 80 },
        paper_bgcolor: "#FFFFFF",
        plot_bgcolor: "rgba(0,0,0,0)",
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
          y: 1.15,
          x: 0,
          xanchor: "left",
          font: { family: PE_FONT, size: 12, color: "#000000" },
          bgcolor: "rgba(0,0,0,0)",
        },
        hovermode: "closest",
        hoverlabel: {
          align: "left",
          bgcolor: "#FFFFFF",
          bordercolor: "#E2E8F0",
          font: { family: PE_FONT, size: 13, color: "#000000" },
        },
        modebar: { bgcolor: "rgba(0,0,0,0)", color: "rgba(0,0,0,0)" },
        shapes: [
          {
            type: "line",
            x0: currentEarnings,
            x1: currentEarnings,
            yref: "paper",
            y0: 0,
            y1: 1,
            line: { color: "#6B7280", width: 1.5, dash: "dash" },
          },
        ],
        annotations: [
          {
            x: currentEarnings,
            xref: "x",
            yref: "paper",
            y: 0.97,
            text: `Your earnings: $${currentEarnings.toLocaleString()}`,
            showarrow: false,
            font: { family: PE_FONT, size: 12, color: "#5A5A5A" },
            xanchor: "left",
            xshift: 6,
            bgcolor: "rgba(255,255,255,0.85)",
          },
        ],
        images: [
          {
            source: PE_LOGO_URL,
            xref: "paper",
            yref: "paper",
            x: 1.0,
            y: -0.22,
            sizex: 0.13,
            sizey: 0.13,
            xanchor: "right",
            yanchor: "bottom",
            opacity: 0.9,
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
