import { useEffect, useState } from "react";
import type { Poi, WeatherData } from "../types";
import { fetchWeather, getCachedWeather, weatherCacheKey } from "../lib/weatherApi";

interface UseWeatherResult {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useWeather(poi: Poi | null): UseWeatherResult {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!poi) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    const cached = getCachedWeather(poi);
    if (cached) {
      setData(cached);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let active = true;
    setData(null);
    setLoading(true);
    setError(null);

    fetchWeather(poi, controller.signal)
      .then((weather) => {
        if (!active) return;
        setData(weather);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (!active || (reason instanceof DOMException && reason.name === "AbortError")) return;
        setError(reason instanceof Error ? reason.message : "Impossibile caricare il meteo.");
        setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [poi, nonce]);

  return {
    data,
    loading,
    error,
    refresh: () => {
      if (!poi) return;
      localStorage.removeItem(`mv-weather-v1:${weatherCacheKey(poi)}`);
      setNonce((value) => value + 1);
    },
  };
}
