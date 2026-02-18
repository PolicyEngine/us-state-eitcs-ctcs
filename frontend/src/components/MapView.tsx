import React, { useEffect, useRef, useCallback, useState } from "react";
import type { CSSProperties } from "react";
import maplibregl from "maplibre-gl";
import type { GeoJSON, GeoJSONFeature } from "../data/useData";
import type { MetricKey, ViewType } from "../types";
import { METRICS } from "../types";
import { formatValue } from "../utils";
import {
  STATE_CODES,
  STATE_NAME_TO_CODE,
  STATE_FIPS_NAMES,
  COLOR_SCALE,
  ZERO_COLOR,
  NO_DATA_COLOR,
} from "../data/constants";
import MapLegend from "./MapLegend";

interface MapViewProps {
  stateGeoData: GeoJSON;
  districtGeoData: GeoJSON;
  filteredData: Record<string, unknown>[];
  viewType: ViewType;
  metric: MetricKey;
  creditType: string;
  onRegionClick: (region: { id: string | number; name: string }) => void;
}

const containerStyles: Record<string, CSSProperties> = {
  mapContainer: {
    background: "var(--white)",
    borderRadius: 12,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    overflow: "hidden",
    position: "relative",
  },
  mapHeader: {
    padding: "16px 20px",
    borderBottom: "1px solid var(--slate-100)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mapTitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 15,
    fontWeight: 600,
    color: "var(--slate-800)",
  },
  mapEl: {
    width: "100%",
    height: 560,
  },
};

export default function MapView({
  stateGeoData,
  districtGeoData,
  filteredData,
  viewType,
  metric,
  creditType,
  onRegionClick,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const handlersRef = useRef<{
    mousemove?: (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => void;
    mouseleave?: () => void;
    click?: (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => void;
  }>({});

  const metricInfo = METRICS.find((m) => m.key === metric)!;
  const viewLabel =
    viewType === "state" ? "States" : "Congressional Districts";

  const [legendValues, setLegendValues] = useState({
    title: metricInfo.label,
    max: "--",
    min: "--",
  });

  const buildEnrichedGeo = useCallback(() => {
    const dataMap: Record<string | number, Record<string, unknown>> = {};
    if (viewType === "state") {
      filteredData.forEach((row) => {
        dataMap[row.state as string] = row;
      });
    } else {
      filteredData.forEach((row) => {
        dataMap[row.congressional_district_geoid as number] = row;
      });
    }

    const geoData = viewType === "state" ? stateGeoData : districtGeoData;

    const enriched: GeoJSON = {
      type: "FeatureCollection",
      features: geoData.features.map((feature: GeoJSONFeature) => {
        let id: string | number | undefined;
        if (viewType === "state") {
          const name = feature.properties.name as string | undefined;
          id = name ? STATE_NAME_TO_CODE[name] : undefined;
        } else {
          if (feature.properties.GEOID) {
            id = parseInt(feature.properties.GEOID as string, 10);
          }
        }
        const rowData = id !== undefined ? dataMap[id] : undefined;
        const value = rowData ? (rowData[metric] as number | null) : null;
        return {
          ...feature,
          properties: {
            ...feature.properties,
            value,
            dataId: id,
          },
        };
      }),
    };

    const statesWithProgram = filteredData.filter(
      (d) => Math.abs((d.cost as number) || 0) >= 0.01,
    );
    const allValues = statesWithProgram
      .map((d) => d[metric] as number)
      .filter((v) => !isNaN(v) && v !== null);
    const min = allValues.length > 0 ? Math.min(...allValues) : 0;
    const max = allValues.length > 0 ? Math.max(...allValues) : 1;

    enriched.features.forEach((feature, index) => {
      feature.id = index;
      const value = feature.properties.value as number | null;
      const dataId = feature.properties.dataId as string | number | undefined;
      const rowData = dataId !== undefined ? dataMap[dataId] : undefined;
      const hasNoProgram =
        !rowData || Math.abs((rowData.cost as number) || 0) < 0.01;

      if (value === null || value === undefined || isNaN(value as number)) {
        feature.properties.fillColor = NO_DATA_COLOR;
        feature.properties.isNA = true;
      } else if (hasNoProgram) {
        feature.properties.fillColor = ZERO_COLOR;
        feature.properties.isNA = true;
      } else {
        let ratio = 0;
        if (max > min) {
          ratio = Math.max(0, (value - min) / (max - min));
          ratio = Math.sqrt(ratio);
        }
        const idx = Math.max(
          0,
          Math.min(
            Math.floor(ratio * (COLOR_SCALE.length - 1)),
            COLOR_SCALE.length - 1,
          ),
        );
        feature.properties.fillColor = COLOR_SCALE[idx];
        feature.properties.isNA = false;
      }
    });

    return { enriched, min, max };
  }, [filteredData, viewType, metric, stateGeoData, districtGeoData]);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#FFFFFF" },
          },
        ],
      },
      center: [-98, 39],
      zoom: 3.5,
      minZoom: 2,
      maxZoom: 10,
    });

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
    });

    mapRef.current = map;
    popupRef.current = popup;

    map.on("load", () => {
      // Signal that map is ready
      map.resize();
    });

    return () => {
      popup.remove();
      map.remove();
      mapRef.current = null;
      popupRef.current = null;
    };
  }, []);

  // Render/update map layer when dependencies change
  useEffect(() => {
    const map = mapRef.current;
    const popup = popupRef.current;
    if (!map || !popup) return;

    const doRender = () => {
      const { enriched, min, max } = buildEnrichedGeo();

      // Remove old handlers
      if (handlersRef.current.mousemove) {
        map.off("mousemove", "regions-fill", handlersRef.current.mousemove as unknown as (e: maplibregl.MapMouseEvent) => void);
      }
      if (handlersRef.current.mouseleave) {
        map.off("mouseleave", "regions-fill", handlersRef.current.mouseleave);
      }
      if (handlersRef.current.click) {
        map.off("click", "regions-fill", handlersRef.current.click as unknown as (e: maplibregl.MapMouseEvent) => void);
      }

      // Remove old layers
      if (map.getLayer("regions-fill")) map.removeLayer("regions-fill");
      if (map.getLayer("regions-line")) map.removeLayer("regions-line");
      if (map.getLayer("regions-hover-line"))
        map.removeLayer("regions-hover-line");
      if (map.getSource("regions")) map.removeSource("regions");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.addSource("regions", {
        type: "geojson",
        data: enriched as any,
        tolerance: 0.1,
      });

      map.addLayer({
        id: "regions-fill",
        type: "fill",
        source: "regions",
        paint: {
          "fill-color": ["get", "fillColor"],
          "fill-opacity": 1.0,
          "fill-antialias": false,
        },
      });

      map.addLayer({
        id: "regions-line",
        type: "line",
        source: "regions",
        paint: {
          "line-color": "#94A3B8",
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3,
            0.8,
            5,
            1.2,
            8,
            2,
          ],
        },
      });

      map.addLayer({
        id: "regions-hover-line",
        type: "line",
        source: "regions",
        paint: {
          "line-color": "#134E4A",
          "line-width": 3,
          "line-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            1,
            0,
          ],
        },
      });

      setLegendValues({
        title: metricInfo.label,
        max: formatValue(max, metricInfo.format),
        min: formatValue(min, metricInfo.format),
      });

      // Set up event handlers
      let hoveredFeatureId: number | null = null;

      const handleMouseMove = (
        e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] },
      ) => {
        if (!e.features || e.features.length === 0) return;
        map.getCanvas().style.cursor = "pointer";
        const feature = e.features[0];
        const featureId = feature.id as number;
        const value = feature.properties?.value;
        const dataId = feature.properties?.dataId;
        const isNA = feature.properties?.isNA;

        if (hoveredFeatureId !== featureId) {
          if (hoveredFeatureId !== null) {
            map.setFeatureState(
              { source: "regions", id: hoveredFeatureId },
              { hover: false },
            );
          }
          hoveredFeatureId = featureId;
          map.setFeatureState(
            { source: "regions", id: featureId },
            { hover: true },
          );
        }

        let name: string;
        if (viewType === "state") {
          name =
            STATE_CODES[dataId as string] ||
            (feature.properties?.name as string) ||
            String(dataId);
        } else {
          const numId =
            typeof dataId === "string"
              ? parseInt(dataId, 10)
              : (dataId as number);
          const stateFips = Math.floor(numId / 100);
          const districtNum = numId % 100;
          const stateName = STATE_FIPS_NAMES[stateFips] || "Unknown";
          const districtLabel =
            (feature.properties?.NAMELSAD as string) ||
            `District ${districtNum}`;
          name = `${stateName}<br>${districtLabel}`;
        }

        const parsedValue =
          typeof value === "string" ? parseFloat(value) : value;
        const displayValue =
          isNA === true || isNA === "true"
            ? "N/A - No program"
            : formatValue(parsedValue as number, metricInfo.format);

        const html = `
          <div class="popup-title">${name}</div>
          <div class="popup-value"><strong>${metricInfo.label}:</strong> ${displayValue}</div>
          ${isNA !== true && isNA !== "true" ? '<div class="popup-hint">Click to explore →</div>' : ""}
        `;
        popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
      };

      const handleMouseLeave = () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
        if (hoveredFeatureId !== null) {
          map.setFeatureState(
            { source: "regions", id: hoveredFeatureId },
            { hover: false },
          );
          hoveredFeatureId = null;
        }
      };

      const handleClick = (
        e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] },
      ) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const dataId = feature.properties?.dataId;
        let regionName: string;
        if (viewType === "state") {
          regionName =
            STATE_CODES[dataId as string] ||
            (feature.properties?.name as string) ||
            String(dataId);
        } else {
          const numId =
            typeof dataId === "string"
              ? parseInt(dataId, 10)
              : (dataId as number);
          const stateFips = Math.floor(numId / 100);
          const districtNum = numId % 100;
          const stateName = STATE_FIPS_NAMES[stateFips] || "Unknown";
          regionName = `${stateName} District ${districtNum}`;
        }
        onRegionClick({ id: dataId, name: regionName });
      };

      // Store refs for cleanup
      handlersRef.current = {
        mousemove: handleMouseMove,
        mouseleave: handleMouseLeave,
        click: handleClick,
      };

      map.on("mousemove", "regions-fill", handleMouseMove as unknown as (e: maplibregl.MapMouseEvent) => void);
      map.on("mouseleave", "regions-fill", handleMouseLeave);
      map.on("click", "regions-fill", handleClick as unknown as (e: maplibregl.MapMouseEvent) => void);
    };

    if (map.loaded()) {
      doRender();
    } else {
      map.on("load", doRender);
    }
  }, [buildEnrichedGeo, viewType, metricInfo, creditType, onRegionClick]);

  // Suppress unused var warning
  void React;

  return (
    <div style={containerStyles.mapContainer}>
      <div style={containerStyles.mapHeader}>
        <span style={containerStyles.mapTitle}>
          {metricInfo.label} by {viewLabel}
        </span>
      </div>
      <div
        ref={mapContainerRef}
        style={containerStyles.mapEl}
        role="application"
        aria-label={`Interactive map showing ${metricInfo.label} by ${viewLabel}`}
      />
      <MapLegend
        title={legendValues.title}
        maxLabel={legendValues.max}
        minLabel={legendValues.min}
      />
    </div>
  );
}
