import { useState, useMemo, useCallback, lazy, Suspense } from "react";
import type { CSSProperties } from "react";
import { useData } from "./data/useData";
import Masthead from "./components/Masthead";
import Hero from "./components/Hero";
import StatsBanner from "./components/StatsBanner";
import ControlBar from "./components/ControlBar";
import Footer from "./components/Footer";
import type { MetricKey, ViewType, SupportedYear } from "./types";

const Visualization = lazy(() => import("./components/Visualization"));

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

  // Always compute national stats from district-level data so the number
  // is the same regardless of state vs district view toggle.
  const nationalDistrictData = useMemo(() => {
    if (!yearData) return [];
    return yearData.districtData.filter((row) => row.reform_type === creditType);
  }, [yearData, creditType]);

  const stats = useMemo(() => {
    if (nationalDistrictData.length === 0)
      return { totalCost: 0, povertyReduction: 0, childPovertyReduction: 0 };

    const totalCost = nationalDistrictData.reduce(
      (sum, d) => sum + (d.cost || 0),
      0,
    );

    // Sum raw weighted counts across all districts for true national rates
    const totalBaselinePoverty = nationalDistrictData.reduce(
      (sum, d) => sum + (d.baseline_poverty_count || 0), 0);
    const totalReformPoverty = nationalDistrictData.reduce(
      (sum, d) => sum + (d.reform_poverty_count || 0), 0);
    const totalPopulation = nationalDistrictData.reduce(
      (sum, d) => sum + (d.population || 0), 0);

    const totalBaselineChildPoverty = nationalDistrictData.reduce(
      (sum, d) => sum + (d.baseline_child_poverty_count || 0), 0);
    const totalReformChildPoverty = nationalDistrictData.reduce(
      (sum, d) => sum + (d.reform_child_poverty_count || 0), 0);
    const totalChildPopulation = nationalDistrictData.reduce(
      (sum, d) => sum + (d.child_population || 0), 0);

    // National poverty rate = total in poverty / total population
    const baselineRate = totalPopulation > 0 ? totalBaselinePoverty / totalPopulation : 0;
    const reformRate = totalPopulation > 0 ? totalReformPoverty / totalPopulation : 0;
    const povertyReduction = reformRate > 0 ? (reformRate - baselineRate) / reformRate : 0;

    const baselineChildRate = totalChildPopulation > 0
      ? totalBaselineChildPoverty / totalChildPopulation : 0;
    const reformChildRate = totalChildPopulation > 0
      ? totalReformChildPoverty / totalChildPopulation : 0;
    const childPovertyReduction = reformChildRate > 0
      ? (reformChildRate - baselineChildRate) / reformChildRate : 0;

    return { totalCost, povertyReduction, childPovertyReduction };
  }, [nationalDistrictData]);

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

  if (loading) {
    return (
      <>
        <Masthead />
        <Hero />
        <div style={styles.loading} role="status" aria-live="polite">
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
        povertyReduction={stats.povertyReduction}
        childPovertyReduction={stats.childPovertyReduction}
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
          <Suspense
            fallback={
              <div style={styles.loading} role="status" aria-live="polite">
                <div style={styles.spinner} />
                <p>Loading map...</p>
              </div>
            }
          >
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
          </Suspense>
        )}
      </main>
      <Footer year={year} />
    </>
  );
}
