import { useState, useMemo, useCallback } from "react";
import type { CSSProperties } from "react";
import { useData } from "./data/useData";
import Masthead from "./components/Masthead";
import Hero from "./components/Hero";
import StatsBanner from "./components/StatsBanner";
import ControlBar from "./components/ControlBar";
import Visualization from "./components/Visualization";
import Footer from "./components/Footer";
import type { MetricKey, ViewType, SupportedYear } from "./types";

const styles: Record<string, CSSProperties> = {
  mainContent: {
    maxWidth: 1400,
    margin: "0 auto",
    padding: "48px 32px",
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "120px 40px",
    color: "var(--slate-500)",
  },
  spinner: {
    width: 40,
    height: 40,
    border: "3px solid var(--slate-200)",
    borderTopColor: "var(--teal-500)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    marginBottom: 20,
  },
  error: {
    maxWidth: 600,
    margin: "80px auto",
    padding: "40px",
    textAlign: "center",
    color: "#dc2626",
    fontWeight: 600,
  },
};

export default function App() {
  const { dataByYear, stateGeoData, districtGeoData, loading, error } =
    useData();

  const [year, setYear] = useState<SupportedYear>(2025);
  const [viewType, setViewType] = useState<ViewType>("state");
  const [creditType, setCreditType] = useState("CTCs and EITCs");
  const [metric, setMetric] = useState<MetricKey>("cost");
  const [selectedRegion, setSelectedRegion] = useState<{
    id: string | number;
    name: string;
  } | null>(null);

  const yearData = dataByYear[year];

  const filteredData = useMemo(() => {
    if (!yearData) return [];
    const data =
      viewType === "state" ? yearData.stateData : yearData.districtData;
    return data.filter((row) => row.reform_type === creditType);
  }, [yearData, viewType, creditType]);

  const stats = useMemo(() => {
    if (filteredData.length === 0)
      return { totalCost: 0, avgPoverty: 0, avgChildPoverty: 0 };
    const totalCost = filteredData.reduce(
      (sum, d) => sum + (d.cost || 0),
      0,
    );
    const avgPoverty =
      filteredData.reduce(
        (sum, d) => sum + (d.poverty_pct_cut || 0),
        0,
      ) / filteredData.length;
    const avgChildPoverty =
      filteredData.reduce(
        (sum, d) => sum + (d.child_poverty_pct_cut || 0),
        0,
      ) / filteredData.length;
    return { totalCost, avgPoverty, avgChildPoverty };
  }, [filteredData]);

  const regionData = useMemo(() => {
    if (!selectedRegion || filteredData.length === 0) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = filteredData as any[];
    let row;
    if (viewType === "state") {
      row = rows.find((d) => d.state === selectedRegion.id);
    } else {
      row = rows.find(
        (d) => d.congressional_district_geoid === selectedRegion.id,
      );
    }
    if (!row) return null;
    return {
      cost: row.cost as number,
      poverty_pct_cut: row.poverty_pct_cut as number,
      child_poverty_pct_cut: row.child_poverty_pct_cut as number,
    };
  }, [selectedRegion, filteredData, viewType]);

  const handleViewTypeChange = useCallback((v: ViewType) => {
    setViewType(v);
    setSelectedRegion(null);
  }, []);

  const handleCreditTypeChange = useCallback((c: string) => {
    setCreditType(c);
  }, []);

  const handleYearChange = useCallback((y: SupportedYear) => {
    setYear(y);
  }, []);

  const handleRegionClick = useCallback(
    (region: { id: string | number; name: string }) => {
      setSelectedRegion(region);
    },
    [],
  );

  const viewLabel =
    viewType === "state" ? "states" : "congressional districts";

  if (loading) {
    return (
      <>
        <Masthead />
        <Hero />
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <p>Loading data...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Masthead />
        <Hero />
        <div style={styles.error}>
          <p>Error loading data: {error}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Masthead />
      <Hero />
      <StatsBanner
        totalCost={stats.totalCost}
        avgPoverty={stats.avgPoverty}
        avgChildPoverty={stats.avgChildPoverty}
        viewLabel={viewLabel}
      />
      <main style={styles.mainContent}>
        <ControlBar
          year={year}
          onYearChange={handleYearChange}
          viewType={viewType}
          onViewTypeChange={handleViewTypeChange}
          creditType={creditType}
          onCreditTypeChange={handleCreditTypeChange}
          metric={metric}
          onMetricChange={setMetric}
        />
        {stateGeoData && districtGeoData && (
          <Visualization
            stateGeoData={stateGeoData}
            districtGeoData={districtGeoData}
            filteredData={filteredData as unknown as Record<string, unknown>[]}
            viewType={viewType}
            metric={metric}
            creditType={creditType}
            selectedRegion={selectedRegion}
            regionData={regionData}
            onRegionClick={handleRegionClick}
          />
        )}
      </main>
      <Footer year={year} />
    </>
  );
}
