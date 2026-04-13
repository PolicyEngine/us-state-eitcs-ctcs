import type { CSSProperties } from "react";
import MapView from "./MapView";
import DetailPanel from "./DetailPanel";
import type { GeoJSON } from "../data/useData";
import type { MetricKey, ViewType } from "../types";

interface VisualizationProps {
  stateGeoData: GeoJSON;
  districtGeoData: GeoJSON;
  filteredData: Record<string, unknown>[];
  viewType: ViewType;
  metric: MetricKey;
  creditType: string;
  selectedRegion: { id: string | number; name: string } | null;
  regionData: {
    cost: number;
    poverty_pct_cut: number;
    child_poverty_pct_cut: number;
  } | null;
  onRegionClick: (region: { id: string | number; name: string }) => void;
}

const styles: Record<string, CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 340px",
    gap: 24,
    animation: "fadeInUp 0.5s ease-out 0.3s both",
  },
};

export default function Visualization({
  stateGeoData,
  districtGeoData,
  filteredData,
  viewType,
  metric,
  creditType,
  selectedRegion,
  regionData,
  onRegionClick,
}: VisualizationProps) {
  return (
    <div style={styles.grid} className="visualization-grid">
      <MapView
        stateGeoData={stateGeoData}
        districtGeoData={districtGeoData}
        filteredData={filteredData}
        viewType={viewType}
        metric={metric}
        creditType={creditType}
        onRegionClick={onRegionClick}
      />
      <DetailPanel
        selectedRegion={selectedRegion}
        regionData={regionData}
        creditType={creditType}
        viewType={viewType}
      />
    </div>
  );
}
