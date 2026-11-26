import { describe, expect, it } from "vitest";
import type { PeakPoi, Poi, WebcamPoi } from "../types";
import {
  distanceKm,
  formatCoordinates,
  formatDistance,
  formatElevation,
  kindLabel,
  nearbyWebcams,
  osmLink,
  pluralKind,
  searchPois,
} from "./geo";

const poi = (overrides: Partial<PeakPoi> = {}): Poi => ({
  id: "peak-test",
  kind: "peak",
  name: "Monte Test",
  lat: 42.4692,
  lon: 13.5656,
  elevation: 2912,
  group: "Gran Sasso d'Italia",
  description: "",
  imageUrl: null,
  imageCredit: null,
  sourceUrl: "https://example.test",
  sourceLabel: "Test",
  tags: ["Vetta", "Gran Sasso d'Italia"],
  featured: false,
  ...overrides,
});

const webcam = (id: string, lat: number, lon: number): WebcamPoi => ({
  id,
  kind: "webcam",
  name: `Webcam ${id}`,
  lat,
  lon,
  elevation: 2000,
  group: "Gran Sasso d'Italia",
  description: "",
  imageUrl: null,
  imageCredit: null,
  sourceUrl: "https://example.test",
  sourceLabel: "Test",
  tags: ["Webcam live"],
  featured: false,
  webcamKey: id,
  accuracy: "locality",
});

describe("distanceKm", () => {
  it("returns zero for the same point and is symmetric", () => {
    const a = { lat: 42.4692, lon: 13.5656 };
    const b = { lat: 42.443, lon: 13.5587 };
    expect(distanceKm(a, a)).toBe(0);
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 10);
  });

  it("matches the expected distance between two known Abruzzo locations", () => {
    const cornoGrande = { lat: 42.4692, lon: 13.5656 };
    const campoImperatore = { lat: 42.443, lon: 13.5587 };
    expect(distanceKm(cornoGrande, campoImperatore)).toBeCloseTo(3, 0);
  });
});

describe("nearbyWebcams", () => {
  const origin = poi();
  const near = webcam("near", 42.47, 13.57);
  const middle = webcam("middle", 42.51, 13.6);
  const far = webcam("far", 42.8, 14.1);

  it("excludes the POI itself and sorts by distance", () => {
    const self = { ...webcam("self", origin.lat, origin.lon), id: origin.id };
    const result = nearbyWebcams(origin, [far, self, middle, near], 3, 100);
    expect(result.map((item) => item.webcam.id)).toEqual(["near", "middle", "far"]);
    expect(result[0].distanceKm).toBeLessThan(result[1].distanceKm);
  });

  it("respects the radius and limit", () => {
    const result = nearbyWebcams(origin, [far, middle, near], 1, 30);
    expect(result).toHaveLength(1);
    expect(result[0].webcam.id).toBe("near");
  });

  it("falls back to the nearest cameras when none is within the radius", () => {
    const result = nearbyWebcams(origin, [far, middle], 1, 0.1);
    expect(result).toHaveLength(1);
    expect(result[0].webcam.id).toBe("middle");
  });
});

describe("formatters", () => {
  it("formats distances with Italian units", () => {
    expect(formatDistance(0.45)).toBe("450 m");
    expect(formatDistance(1.5)).toBe("1.5 km");
    expect(formatDistance(12.4)).toBe("12 km");
  });

  it("formats elevations and handles missing values", () => {
    expect(formatElevation(2912)).toBe("2912 m");
    expect(formatElevation(12345)).toBe("12.345 m");
    expect(formatElevation(null)).toBe("n.d.");
    expect(formatElevation(Number.NaN)).toBe("n.d.");
  });

  it("formats coordinates with hemispheres", () => {
    expect(formatCoordinates(42.4692, 13.5656)).toBe("42.4692° N, 13.5656° E");
    expect(formatCoordinates(-41.9, -13.2)).toBe("41.9000° S, 13.2000° O");
  });

  it("builds an OpenStreetMap link", () => {
    expect(osmLink(42.4692, 13.5656)).toBe(
      "https://www.openstreetmap.org/#map=14/42.46920/13.56560",
    );
  });

  it("uses Italian labels for POI kinds", () => {
    expect(kindLabel("peak")).toBe("Vetta");
    expect(kindLabel("hut")).toBe("Rifugio");
    expect(kindLabel("webcam")).toBe("Webcam live");
    expect(pluralKind("peak", 1)).toBe("vetta");
    expect(pluralKind("peak", 2)).toBe("vette");
    expect(pluralKind("webcam", 4)).toBe("webcam");
  });
});

describe("searchPois", () => {
  const items = [
    poi({ id: "a", name: "Corno Grande", tags: ["Vetta"], elevation: 2912, featured: false }),
    poi({ id: "b", name: "Corno Piccolo", tags: ["Vetta"], elevation: 2655, featured: true }),
    poi({ id: "c", name: "Monte Amaro", group: "Majella", tags: ["Vetta"], elevation: 2793 }),
    poi({
      id: "d",
      name: "Rifugio Duca degli Abruzzi",
      province: "L'Aquila",
      tags: ["Rifugio"],
      elevation: 1926,
    }),
  ];

  it("ignores queries shorter than two characters", () => {
    expect(searchPois(items, "C")).toEqual([]);
    expect(searchPois(items, "  ")).toEqual([]);
  });

  it("ignores accents and matches group, province and tags", () => {
    expect(searchPois(items, "corno").map((item) => item.id)).toEqual(["b", "a"]);
    expect(searchPois(items, "majella").map((item) => item.id)).toEqual(["c"]);
    expect(searchPois(items, "aquila").map((item) => item.id)).toEqual(["d"]);
    expect(searchPois(items, "rifugio").map((item) => item.id)).toEqual(["d"]);
  });

  it("ranks featured items first and applies the limit", () => {
    expect(searchPois(items, "corno").map((item) => item.id)).toEqual(["b", "a"]);
    expect(searchPois(items, "corno", 1).map((item) => item.id)).toEqual(["b"]);
  });
});
