import { useState, useMemo } from "react";
import {
  MantineProvider,
  Container,
  Title,
  Text,
  Select,
  Stack,
  Group,
  Loader,
  Alert,
  Anchor,
} from "@mantine/core";
import "@mantine/core/styles.css";
import { useResults } from "./data/useResults";
import USMap from "./components/USMap";
import StateTable from "./components/StateTable";
import { METRICS, REFORM_TYPES, YEARS } from "./types";
import type { MetricKey } from "./types";
import { colors, fonts } from "./designTokens";

export default function App() {
  const { data, loading, error } = useResults();
  const [selectedPolicy, setSelectedPolicy] = useState(REFORM_TYPES[2]);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>(
    METRICS[0].key,
  );
  const [selectedYear, setSelectedYear] = useState(YEARS[1]); // Default to 2025

  const metricLabel =
    METRICS.find((m) => m.key === selectedMetric)?.label ?? "";

  const filteredData = useMemo(
    () =>
      data.filter(
        (row) =>
          row.reform_type === selectedPolicy && row.year === selectedYear,
      ),
    [data, selectedPolicy, selectedYear],
  );

  if (loading) {
    return (
      <MantineProvider>
        <Container size="md" py="xl">
          <Stack align="center" gap="md">
            <Loader color={colors.primary} />
            <Text>Loading data...</Text>
          </Stack>
        </Container>
      </MantineProvider>
    );
  }

  if (error) {
    return (
      <MantineProvider>
        <Container size="md" py="xl">
          <Alert color="red" title="Error">
            {error}
          </Alert>
        </Container>
      </MantineProvider>
    );
  }

  return (
    <MantineProvider
      theme={{
        primaryColor: "teal",
        fontFamily: fonts.body,
      }}
    >
      <Container size="lg" py="xl">
        <Stack gap="lg">
          <div>
            <Title order={1} mb="xs" style={{ color: colors.text }}>
              State EITC and CTC impacts
            </Title>
            <Text c="dimmed" size="lg">
              31 states have an Earned Income Tax Credit and 13 have a Child Tax
              Credit. This app shows how they compare in terms of cost, poverty,
              and inequality.
            </Text>
          </div>

          <Group grow>
            <Select
              label="Year"
              data={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
              value={String(selectedYear)}
              onChange={(v) => v && setSelectedYear(Number(v))}
              allowDeselect={false}
            />
            <Select
              label="Policy"
              data={REFORM_TYPES}
              value={selectedPolicy}
              onChange={(v) => v && setSelectedPolicy(v)}
              allowDeselect={false}
            />
            <Select
              label="Metric"
              data={METRICS.map((m) => ({ value: m.key, label: m.label }))}
              value={selectedMetric}
              onChange={(v) => v && setSelectedMetric(v as MetricKey)}
              allowDeselect={false}
            />
          </Group>

          <Title order={3} style={{ color: colors.text }}>
            Impact of state {selectedPolicy.toLowerCase()} on{" "}
            {metricLabel.toLowerCase()} ({selectedYear})
          </Title>

          <USMap
            data={filteredData}
            metric={selectedMetric}
            metricLabel={metricLabel}
          />

          <StateTable
            data={filteredData}
            metric={selectedMetric}
            metricLabel={metricLabel}
          />

          <Text size="sm" c="dimmed" ta="center">
            Data and calculations provided by{" "}
            <Anchor href="https://policyengine.org/" target="_blank">
              PolicyEngine
            </Anchor>
            .
          </Text>
        </Stack>
      </Container>
    </MantineProvider>
  );
}
