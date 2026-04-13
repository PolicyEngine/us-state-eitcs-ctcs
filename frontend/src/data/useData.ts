import { useState, useEffect, useRef } from "react";
import { parseCSV } from "./parseCSV";
import { STATE_NAME_TO_CODE } from "./constants";
import type { StateResult, DistrictResult, SupportedYear } from "../types";
import { SUPPORTED_YEARS } from "../types";

export interface GeoJSON {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

export interface GeoJSONFeature {
  type: "Feature";
  id?: number;
  properties: Record<string, unknown>;
  geometry: {
    type: string;
    coordinates: unknown;
  };
}

interface DataByYear {
  stateData: StateResult[];
  districtData: DistrictResult[];
}

interface UseDataReturn {
  dataByYear: Record<number, DataByYear>;
  stateGeoData: GeoJSON | null;
  districtGeoData: GeoJSON | null;
  availableYears: number[];
  loading: boolean;
  error: string | null;
}

function transformAlaska(
  coords: unknown,
  scale: number,
  targetLng: number,
  targetLat: number,
): unknown {
  const centerLng = -154;
  const centerLat = 64;
  if (Array.isArray(coords) && typeof coords[0] === "number") {
    return [
      targetLng + (coords[0] - centerLng) * scale,
      targetLat + (coords[1] - centerLat) * scale,
    ];
  }
  if (Array.isArray(coords)) {
    return coords.map((c) => transformAlaska(c, scale, targetLng, targetLat));
  }
  return coords;
}

function transformHawaii(
  coords: unknown,
  targetLng: number,
  targetLat: number,
): unknown {
  const centerLng = -155.5;
  const centerLat = 20;
  if (Array.isArray(coords) && typeof coords[0] === "number") {
    return [
      targetLng + coords[0] - centerLng,
      targetLat + coords[1] - centerLat,
    ];
  }
  if (Array.isArray(coords)) {
    return coords.map((c) => transformHawaii(c, targetLng, targetLat));
  }
  return coords;
}

function transformStateGeo(geoJson: GeoJSON): GeoJSON {
  const filteredFeatures = geoJson.features
    .filter(
      (f) => (f.properties as { name?: string }).name !== "Puerto Rico",
    )
    .map((f) => {
      const name = (f.properties as { name?: string }).name;
      if (name === "Alaska") {
        return {
          ...f,
          properties: {
            ...f.properties,
            stateCode: STATE_NAME_TO_CODE[name],
          },
          geometry: {
            ...f.geometry,
            coordinates: transformAlaska(
              f.geometry.coordinates,
              0.35,
              -125,
              27,
            ),
          },
        };
      } else if (name === "Hawaii") {
        return {
          ...f,
          properties: {
            ...f.properties,
            stateCode: STATE_NAME_TO_CODE[name],
          },
          geometry: {
            ...f.geometry,
            coordinates: transformHawaii(f.geometry.coordinates, -108, 27),
          },
        };
      }
      return {
        ...f,
        properties: {
          ...f.properties,
          stateCode: name ? STATE_NAME_TO_CODE[name] : undefined,
        },
      };
    });

  return { type: "FeatureCollection", features: filteredFeatures };
}

function transformDistrictGeo(geoJson: GeoJSON): GeoJSON {
  const features = geoJson.features.map((f) => {
    const props = f.properties as {
      STATEFP?: string;
      GEOID?: string;
    };
    const stateCode =
      props.STATEFP || (props.GEOID ? props.GEOID.substring(0, 2) : null);
    if (stateCode === "02") {
      return {
        ...f,
        geometry: {
          ...f.geometry,
          coordinates: transformAlaska(
            f.geometry.coordinates,
            0.35,
            -125,
            27,
          ),
        },
      };
    } else if (stateCode === "15") {
      return {
        ...f,
        geometry: {
          ...f.geometry,
          coordinates: transformHawaii(f.geometry.coordinates, -108, 27),
        },
      };
    }
    return f;
  });

  return { type: "FeatureCollection", features };
}

export function useData(): UseDataReturn {
  const [dataByYear, setDataByYear] = useState<Record<number, DataByYear>>({});
  const [stateGeoData, setStateGeoData] = useState<GeoJSON | null>(null);
  const [districtGeoData, setDistrictGeoData] = useState<GeoJSON | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    async function load() {
      try {
        // Load GeoJSON files
        const [stateGeoRes, districtGeoRes] = await Promise.all([
          fetch("/data/states_from_districts.geojson"),
          fetch("/data/real_congressional_districts.geojson"),
        ]);

        if (!stateGeoRes.ok || !districtGeoRes.ok) {
          throw new Error("Failed to load GeoJSON data");
        }

        const stateGeoRaw = await stateGeoRes.json();
        const districtGeoRaw = await districtGeoRes.json();

        setStateGeoData(transformStateGeo(stateGeoRaw));
        setDistrictGeoData(transformDistrictGeo(districtGeoRaw));

        // Load all year-specific CSVs in parallel
        const yearPromises = SUPPORTED_YEARS.map(async (year: SupportedYear) => {
          const [stateRes, districtRes] = await Promise.all([
            fetch(`/data/state_impacts_${year}.csv`),
            fetch(`/data/district_impacts_${year}.csv`),
          ]);

          if (!stateRes.ok || !districtRes.ok) {
            throw new Error(`Failed to load data for ${year}`);
          }

          const stateText = await stateRes.text();
          const districtText = await districtRes.text();

          return {
            year,
            stateData: parseCSV<StateResult>(stateText),
            districtData: parseCSV<DistrictResult>(districtText),
          };
        });

        const results = await Promise.all(yearPromises);
        const byYear: Record<number, DataByYear> = {};
        for (const r of results) {
          byYear[r.year] = {
            stateData: r.stateData,
            districtData: r.districtData,
          };
        }
        setDataByYear(byYear);
        setLoading(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unknown error loading data",
        );
        setLoading(false);
      }
    }

    load();
  }, []);

  return {
    dataByYear,
    stateGeoData,
    districtGeoData,
    availableYears: [...SUPPORTED_YEARS],
    loading,
    error,
  };
}
