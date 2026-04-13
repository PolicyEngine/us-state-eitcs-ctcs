import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "../App";

// Mock maplibre-gl with class constructors
vi.mock("maplibre-gl", () => {
  class MockMap {
    on = vi.fn();
    off = vi.fn();
    remove = vi.fn();
    loaded = vi.fn().mockReturnValue(false);
    getCanvas = vi.fn().mockReturnValue({ style: {}, addEventListener: vi.fn() });
    getLayer = vi.fn().mockReturnValue(null);
    getSource = vi.fn().mockReturnValue(null);
    addSource = vi.fn();
    addLayer = vi.fn();
    removeLayer = vi.fn();
    removeSource = vi.fn();
    setFeatureState = vi.fn();
    resize = vi.fn();
    flyTo = vi.fn();
  }
  class MockPopup {
    setLngLat = vi.fn().mockReturnThis();
    setHTML = vi.fn().mockReturnThis();
    addTo = vi.fn().mockReturnThis();
    remove = vi.fn();
  }
  return { default: { Map: MockMap, Popup: MockPopup }, Map: MockMap, Popup: MockPopup };
});

const mockStateCSV = `state,reform_type,cost,poverty_pct_cut,child_poverty_pct_cut,poverty_gap_pct_cut,gini_index_pct_cut
CA,CTCs and EITCs,1068379512.85,0.0126,0.0259,0.0163,0.0021
CO,CTCs and EITCs,974795548.75,0.0992,0.3564,0.0441,0.0015`;

const mockDistrictCSV = `congressional_district_geoid,state_fips,state,reform_type,cost,poverty_pct_cut,child_poverty_pct_cut,poverty_gap_pct_cut,gini_index_pct_cut
601,6,CA,CTCs and EITCs,100000,0.01,0.02,0.01,0.001`;

const mockGeoJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "California" },
      geometry: {
        type: "Polygon",
        coordinates: [[[-120, 37], [-118, 37], [-118, 39], [-120, 39], [-120, 37]]],
      },
    },
  ],
};

beforeEach(() => {
  globalThis.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes("state_impacts")) {
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(mockStateCSV),
      });
    }
    if (url.includes("district_impacts")) {
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(mockDistrictCSV),
      });
    }
    if (url.includes(".geojson")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(JSON.parse(JSON.stringify(mockGeoJSON))),
      });
    }
    return Promise.resolve({ ok: false });
  });
});

describe("App", () => {
  it("shows loading state initially", () => {
    render(<App />);
    expect(screen.getByText("Loading data...")).toBeInTheDocument();
  });

  it("renders the title after loading", async () => {
    render(<App />);
    await waitFor(() => {
      expect(
        screen.getByText(
          "The Impact of State Tax Credits on American Families",
        ),
      ).toBeInTheDocument();
    });
  });

  it("renders the PolicyEngine attribution", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("policyengine.org")).toBeInTheDocument();
    });
  });

  it("shows error state on fetch failure", async () => {
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({ ok: false }),
    );

    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Error loading data/)).toBeInTheDocument();
    });
  });
});
