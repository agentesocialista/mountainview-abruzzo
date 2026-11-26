import type { Poi } from "../types";

export type WeatherKind =
  | "clear"
  | "partly"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "storm";

export interface WeatherMeta {
  label: string;
  kind: WeatherKind;
}

export function weatherMeta(code: number, isDay = true): WeatherMeta {
  if (code === 0) return { label: isDay ? "Sereno" : "Cielo limpido", kind: "clear" };
  if (code === 1) return { label: "Prevalentemente sereno", kind: "clear" };
  if (code === 2) return { label: "Parzialmente nuvoloso", kind: "partly" };
  if (code === 3) return { label: "Nuvoloso", kind: "cloudy" };
  if (code === 45 || code === 48) return { label: "Nebbia", kind: "fog" };
  if (code >= 51 && code <= 57) return { label: "Pioviggine", kind: "drizzle" };
  if (code >= 61 && code <= 67) return { label: "Pioggia", kind: "rain" };
  if (code >= 71 && code <= 77) return { label: "Neve", kind: "snow" };
  if (code >= 80 && code <= 82) return { label: "Rovesci", kind: "rain" };
  if (code === 85 || code === 86) return { label: "Rovesci di neve", kind: "snow" };
  if (code === 95) return { label: "Temporale", kind: "storm" };
  if (code === 96 || code === 99) return { label: "Temporale con grandine", kind: "storm" };
  return { label: "Condizioni variabili", kind: "cloudy" };
}

export function windDirectionLabel(degrees: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return directions[Math.round(degrees / 45) % 8];
}

export function dayLabel(isoDate: string, index: number): string {
  if (index === 0) return "Oggi";
  if (index === 1) return "Domani";
  const date = new Date(`${isoDate}T12:00:00`);
  const label = new Intl.DateTimeFormat("it-IT", { weekday: "short" }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function shortDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short" }).format(date);
}

export function formatTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return "--:--";
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatUpdated(timestamp: number): string {
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function weatherSummary(poi: Poi): string {
  return poi.kind === "peak"
    ? "Previsioni a 7 giorni per la vetta"
    : poi.kind === "hut"
      ? "Previsioni a 7 giorni per il rifugio"
      : "Previsioni a 7 giorni per la webcam";
}
