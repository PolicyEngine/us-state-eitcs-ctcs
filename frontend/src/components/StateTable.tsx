import { Table, Paper, Text } from "@mantine/core";
import type { StateResult, MetricKey } from "../types";
import { STATE_NAMES } from "../types";
import { formatMetricValue } from "../utils";

interface StateTableProps {
  data: StateResult[];
  metric: MetricKey;
  metricLabel: string;
}

export default function StateTable({
  data,
  metric,
  metricLabel,
}: StateTableProps) {
  const filtered = data
    .filter((row) => row[metric] !== 0)
    .sort((a, b) => b[metric] - a[metric])
    .map((row, index) => ({
      rank: index + 1,
      state: STATE_NAMES[row.state] ?? row.state,
      stateCode: row.state,
      value: row[metric],
    }));

  if (filtered.length === 0) {
    return (
      <Paper p="md" withBorder>
        <Text c="dimmed" ta="center">
          No states have a non-zero value for this metric and policy
          combination.
        </Text>
      </Paper>
    );
  }

  return (
    <Paper p="md" withBorder>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Rank</Table.Th>
            <Table.Th>State</Table.Th>
            <Table.Th ta="right">{metricLabel}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {filtered.map((row) => (
            <Table.Tr key={row.stateCode}>
              <Table.Td>{row.rank}</Table.Td>
              <Table.Td>{row.state}</Table.Td>
              <Table.Td ta="right">
                {formatMetricValue(row.value, metric)}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}
