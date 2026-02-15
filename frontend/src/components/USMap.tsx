import { useMemo, useState } from "react";
import { Tooltip, Paper, Text } from "@mantine/core";
import type { StateResult, MetricKey } from "../types";
import { STATE_NAMES } from "../types";
import { colors } from "../designTokens";
import { STATE_PATHS } from "./statePathData";
import { formatMetricValue } from "../utils";

interface USMapProps {
  data: StateResult[];
  metric: MetricKey;
  metricLabel: string;
}

function interpolateColor(value: number, min: number, max: number): string {
  if (value === 0) return "#f0f0f0";
  const absMax = Math.max(Math.abs(min), Math.abs(max));
  if (absMax === 0) return "#f0f0f0";

  const normalized = value / absMax;

  if (normalized > 0) {
    const t = Math.min(normalized, 1);
    const r = Math.round(66 + (1 - t) * 189);
    const g = Math.round(133 + (1 - t) * 122);
    const b = Math.round(244 + (1 - t) * 11);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const t = Math.min(-normalized, 1);
    const r = Math.round(229 + (1 - t) * 26);
    const g = Math.round(62 + (1 - t) * 193);
    const b = Math.round(62 + (1 - t) * 193);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

export default function USMap({ data, metric, metricLabel }: USMapProps) {
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  const { stateValues, min, max } = useMemo(() => {
    const vals: Record<string, number> = {};
    let min = 0;
    let max = 0;
    for (const row of data) {
      vals[row.state] = row[metric];
      if (row[metric] < min) min = row[metric];
      if (row[metric] > max) max = row[metric];
    }
    return { stateValues: vals, min, max };
  }, [data, metric]);

  return (
    <Paper p="md" withBorder>
      <svg
        viewBox="0 0 960 600"
        style={{ width: "100%", height: "auto" }}
        role="img"
        aria-label={`US map showing ${metricLabel} by state`}
      >
        {Object.entries(STATE_PATHS).map(([stateCode, path]) => {
          const value = stateValues[stateCode] ?? 0;
          const fill = interpolateColor(value, min, max);
          const stateName = STATE_NAMES[stateCode] ?? stateCode;
          const isHovered = hoveredState === stateCode;

          return (
            <Tooltip
              key={stateCode}
              label={
                <div>
                  <Text fw={600} size="sm">
                    {stateName}
                  </Text>
                  <Text size="xs">
                    {metricLabel}: {formatMetricValue(value, metric)}
                  </Text>
                </div>
              }
              position="top"
              withArrow
            >
              <path
                d={path}
                fill={fill}
                stroke={isHovered ? colors.primary : "#fff"}
                strokeWidth={isHovered ? 2 : 0.5}
                onMouseEnter={() => setHoveredState(stateCode)}
                onMouseLeave={() => setHoveredState(null)}
                style={{ cursor: "pointer", transition: "fill 0.2s" }}
                data-testid={`state-${stateCode}`}
              />
            </Tooltip>
          );
        })}
      </svg>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 8,
          marginTop: 8,
        }}
      >
        <Text size="xs" c="dimmed">
          Negative
        </Text>
        <div
          style={{
            width: 200,
            height: 12,
            background:
              "linear-gradient(to right, rgb(229,62,62), #f0f0f0, rgb(66,133,244))",
            borderRadius: 4,
          }}
        />
        <Text size="xs" c="dimmed">
          Positive
        </Text>
      </div>
    </Paper>
  );
}
