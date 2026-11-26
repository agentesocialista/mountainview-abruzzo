import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { PeakPoi, Poi } from "../types";

type WeatherApi = typeof import("./weatherApi");

const poi = (overrides: Partial<PeakPoi> = {}): Poi => ({
  id: "peak-corno-grande",
  kind: "peak",
  name: "Corno Grande",
  lat: 42.4692,
  lon: 13.5656,
  elevation: 2912,
  group: "Gran Sasso d'Italia",
  description: "",
  imageUrl: null,
  imageCredit: null,
  sourceUrl: "https://example.test",
  sourceLabel: "Test",
  tags: ["Vetta"],
  featured: true,
  ...overrides,
});

const apiPayload = () => ({
  timezone: "Europe/Rome",
  elevation: 2912,
  current: {
    time: "2026-11-26T18:00",
    temperature_2m: -5.2,
    relative_humidity_2m: 78,
    apparent_temperature: -11.4,
    is_day: 0,
    precipitation: 0,
    weather_code: 71,
    cloud_cover: 74,
    pressure_msl: 1012,
    wind_speed_10m: 21,
    wind_direction_10m: 225,
    wind_gusts_10m: 43,
  },
  daily: {
    time: ["2026-11-26", "2026-11-27"],
    weather_code: [71, 3],
    temperature_2m_max: [-1, 2],
    temperature_2m_min: [-6, -4],
    apparent_temperature_max: [-4, 0],
    apparent_temperature_min: [-11, -7],
    sunrise: ["2026-11-26T07:09", "2026-11-27T07:10"],
    sunset: ["2026-11-26T16:35", "2026-11-27T16:34"],
    uv_index_max: [1.1, 1.5],
    precipitation_sum: [2.4, 0],
    precipitation_probability_max: [100, 5],
    wind_speed_10m_max: [21, 12],
    wind_gusts_10m_max: [43, 25],
  },
});

const storage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  };
};

let api: WeatherApi;

beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal("localStorage", storage());
  api = await import("./weatherApi");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("weatherCacheKey", () => {
  it("includes id, rounded coordinates and elevation", () => {
    expect(api.weatherCacheKey(poi())).toBe("peak-corno-grande:42.4692:13.5656:2912");
    expect(api.weatherCacheKey(poi({ elevation: null }))).toBe(
      "peak-corno-grande:42.4692:13.5656:x",
    );
  });
});

describe("getCachedWeather", () => {
  it("returns null when nothing has been cached", () => {
    expect(api.getCachedWeather(poi())).toBeNull();
  });

  it("returns data fetched through fetchWeather without a second request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => apiPayload(),
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = await api.fetchWeather(poi());
    const second = api.getCachedWeather(poi());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second?.current.temperature).toBe(first.current.temperature);
    expect(second?.daily).toHaveLength(2);
  });

  it("reads a still-valid entry from localStorage", () => {
    const key = `mv-weather-v1:${api.weatherCacheKey(poi())}`;
    localStorage.setItem(
      key,
      JSON.stringify({ data: { ...apiPayload(), fetchedAt: Date.now() }, timestamp: Date.now() }),
    );

    expect(api.getCachedWeather(poi())).not.toBeNull();
  });

  it("ignores expired localStorage entries", () => {
    const key = `mv-weather-v1:${api.weatherCacheKey(poi())}`;
    localStorage.setItem(
      key,
      JSON.stringify({
        data: { ...apiPayload(), fetchedAt: Date.now() },
        timestamp: Date.now() - 21 * 60 * 1000,
      }),
    );

    expect(api.getCachedWeather(poi())).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
  });
});

describe("fetchWeather", () => {
  it("requests seven days of hourly-free forecast data with the POI elevation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => apiPayload(),
    });
    vi.stubGlobal("fetch", fetchMock);

    await api.fetchWeather(poi());

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/v1/forecast");
    expect(url.searchParams.get("latitude")).toBe("42.4692");
    expect(url.searchParams.get("longitude")).toBe("13.5656");
    expect(url.searchParams.get("elevation")).toBe("2912");
    expect(url.searchParams.get("timezone")).toBe("Europe/Rome");
    expect(url.searchParams.get("forecast_days")).toBe("7");
    expect(url.searchParams.get("wind_speed_unit")).toBe("kmh");
    expect(url.searchParams.get("current")).toContain("temperature_2m");
    expect(url.searchParams.get("daily")).toContain("precipitation_probability_max");
  });

  it("maps the Open-Meteo payload into WeatherData", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => apiPayload() }),
    );

    const data = await api.fetchWeather(poi());

    expect(data.timezone).toBe("Europe/Rome");
    expect(data.elevation).toBe(2912);
    expect(data.current.isDay).toBe(false);
    expect(data.current.temperature).toBe(-5.2);
    expect(data.current.windGusts).toBe(43);
    expect(data.daily[0]).toMatchObject({
      date: "2026-11-26",
      weatherCode: 71,
      tempMax: -1,
      tempMin: -6,
      precipitationProbability: 100,
      windGustsMax: 43,
    });
    expect(data.daily[1].tempMax).toBe(2);
  });

  it("throws on an unsuccessful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );

    await expect(api.fetchWeather(poi())).rejects.toThrow("Open-Meteo ha risposto 503");
  });
});
