import type { DailyForecast, Poi, WeatherData } from "../types";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const CACHE_TTL_MS = 20 * 60 * 1000;
const CACHE_PREFIX = "mv-weather-v1:";

const cache = new Map<string, { data: WeatherData; timestamp: number }>();

interface OpenMeteoResponse {
  timezone: string;
  elevation: number;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    weather_code: number;
    cloud_cover: number;
    pressure_msl: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    apparent_temperature_max: number[];
    apparent_temperature_min: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
  };
}

export function weatherCacheKey(poi: Poi): string {
  return `${poi.id}:${poi.lat.toFixed(4)}:${poi.lon.toFixed(4)}:${poi.elevation ?? "x"}`;
}

function readLocalCache(key: string): WeatherData | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: WeatherData; timestamp: number };
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeLocalCache(key: string, data: WeatherData): void {
  try {
    localStorage.setItem(
      `${CACHE_PREFIX}${key}`,
      JSON.stringify({ data, timestamp: Date.now() }),
    );
  } catch {
    // Storage can be unavailable in private browsing; the in-memory cache still works.
  }
}

export function getCachedWeather(poi: Poi): WeatherData | null {
  const key = weatherCacheKey(poi);
  const memory = cache.get(key);
  if (memory && Date.now() - memory.timestamp < CACHE_TTL_MS) return memory.data;
  const local = readLocalCache(key);
  if (local) {
    cache.set(key, { data: local, timestamp: Date.now() });
    return local;
  }
  return null;
}

export async function fetchWeather(poi: Poi, signal?: AbortSignal): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(poi.lat),
    longitude: String(poi.lon),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max",
    timezone: "Europe/Rome",
    forecast_days: "7",
    wind_speed_unit: "kmh",
    temperature_unit: "celsius",
    precipitation_unit: "mm",
  });
  if (poi.elevation !== null) params.set("elevation", String(Math.round(poi.elevation)));

  const response = await fetch(`${FORECAST_URL}?${params}`, { signal });
  if (!response.ok) throw new Error(`Open-Meteo ha risposto ${response.status}`);
  const json = (await response.json()) as OpenMeteoResponse;
  const daily: DailyForecast[] = json.daily.time.map((date, index) => ({
    date,
    weatherCode: json.daily.weather_code[index],
    tempMax: json.daily.temperature_2m_max[index],
    tempMin: json.daily.temperature_2m_min[index],
    apparentMax: json.daily.apparent_temperature_max[index],
    apparentMin: json.daily.apparent_temperature_min[index],
    sunrise: json.daily.sunrise[index],
    sunset: json.daily.sunset[index],
    uvIndex: json.daily.uv_index_max[index],
    precipitationSum: json.daily.precipitation_sum[index],
    precipitationProbability: json.daily.precipitation_probability_max[index],
    windMax: json.daily.wind_speed_10m_max[index],
    windGustsMax: json.daily.wind_gusts_10m_max[index],
  }));

  const data: WeatherData = {
    current: {
      time: json.current.time,
      temperature: json.current.temperature_2m,
      apparentTemperature: json.current.apparent_temperature,
      humidity: json.current.relative_humidity_2m,
      precipitation: json.current.precipitation,
      weatherCode: json.current.weather_code,
      cloudCover: json.current.cloud_cover,
      pressure: json.current.pressure_msl,
      windSpeed: json.current.wind_speed_10m,
      windDirection: json.current.wind_direction_10m,
      windGusts: json.current.wind_gusts_10m,
      isDay: json.current.is_day === 1,
    },
    daily,
    fetchedAt: Date.now(),
    timezone: json.timezone,
    elevation: json.elevation,
  };

  const key = weatherCacheKey(poi);
  cache.set(key, { data, timestamp: Date.now() });
  writeLocalCache(key, data);
  return data;
}
