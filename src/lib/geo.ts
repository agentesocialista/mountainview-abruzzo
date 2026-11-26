import type { Poi, WebcamPoi } from "../types";

const EARTH_RADIUS_KM = 6371.0088;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function distanceKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface NearbyWebcam {
  webcam: WebcamPoi;
  distanceKm: number;
}

export function nearbyWebcams(
  poi: Poi,
  webcams: WebcamPoi[],
  limit = 4,
  radiusKm = 30,
): NearbyWebcam[] {
  const candidates = webcams
    .filter((webcam) => webcam.id !== poi.id)
    .map((webcam) => ({ webcam, distanceKm: distanceKm(poi, webcam) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const withinRadius = candidates.filter((item) => item.distanceKm <= radiusKm);
  return (withinRadius.length > 0 ? withinRadius : candidates).slice(0, limit);
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

export function formatElevation(elevation: number | null): string {
  if (elevation === null || !Number.isFinite(elevation)) return "n.d.";
  return `${new Intl.NumberFormat("it-IT").format(Math.round(elevation))} m`;
}

export function formatCoordinates(lat: number, lon: number): string {
  const latLabel = lat >= 0 ? "N" : "S";
  const lonLabel = lon >= 0 ? "E" : "O";
  return `${Math.abs(lat).toFixed(4)}° ${latLabel}, ${Math.abs(lon).toFixed(4)}° ${lonLabel}`;
}

export function osmLink(lat: number, lon: number, zoom = 14): string {
  return `https://www.openstreetmap.org/#map=${zoom}/${lat.toFixed(5)}/${lon.toFixed(5)}`;
}

export function kindLabel(kind: Poi["kind"]): string {
  if (kind === "peak") return "Vetta";
  if (kind === "hut") return "Rifugio";
  return "Webcam live";
}

export function pluralKind(kind: Poi["kind"], count: number): string {
  if (kind === "peak") return count === 1 ? "vetta" : "vette";
  if (kind === "hut") return count === 1 ? "rifugio" : "rifugi";
  return count === 1 ? "webcam" : "webcam";
}

export function searchPois(pois: Poi[], query: string, limit = 8): Poi[] {
  const normalized = query
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (normalized.length < 2) return [];
  return pois
    .filter((poi) => {
      const haystack = `${poi.name} ${poi.group} ${poi.province ?? ""} ${poi.tags.join(" ")}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return haystack.includes(normalized);
    })
    .sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(query.trim().toLowerCase()) ? 1 : 0;
      const bStarts = b.name.toLowerCase().startsWith(query.trim().toLowerCase()) ? 1 : 0;
      return (
        bStarts - aStarts ||
        Number(b.featured) - Number(a.featured) ||
        (b.elevation ?? 0) - (a.elevation ?? 0) ||
        a.name.localeCompare(b.name, "it")
      );
    })
    .slice(0, limit);
}
