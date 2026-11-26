import L from "leaflet";
import "leaflet.markercluster";
import { Compass, Layers, LocateFixed, Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MapStyle, Poi } from "../types";
import { formatElevation, kindLabel } from "../lib/geo";

interface MapViewProps {
  pois: Poi[];
  selected: Poi | null;
  onSelect: (poi: Poi | null) => void;
  favoriteIds: ReadonlySet<string>;
  mapStyle: MapStyle;
  onMapStyleChange: (style: MapStyle) => void;
}

const TILE_LAYERS: Record<
  MapStyle,
  { url: string; attribution: string; maxZoom: number; label: string }
> = {
  relief: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
    label: "Rilievo",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    maxZoom: 18,
    label: "Satellite",
  },
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
    label: "Chiara",
  },
};

const MAP_STYLE_ORDER: MapStyle[] = ["relief", "satellite", "light"];

const ABRUZZO_BOUNDS = L.latLngBounds(
  [41.62, 12.95],
  [42.92, 14.82],
);

const ABRUZZO_CENTER: L.LatLngTuple = [42.21, 13.83];

/**
 * Several webcams share the same locality coordinates. Nudge duplicates around
 * a small circle so every camera stays clickable once clustering is disabled.
 */
function spreadDuplicates(pois: Poi[]): Map<string, L.LatLngTuple> {
  const groups = new Map<string, Poi[]>();
  for (const poi of pois) {
    const key = `${poi.lat.toFixed(4)},${poi.lon.toFixed(4)}`;
    const group = groups.get(key);
    if (group) group.push(poi);
    else groups.set(key, [poi]);
  }

  const positions = new Map<string, L.LatLngTuple>();
  for (const group of groups.values()) {
    if (group.length === 1) {
      positions.set(group[0].id, [group[0].lat, group[0].lon]);
      continue;
    }
    const radius = 0.0028;
    group.forEach((poi, index) => {
      const angle = (index / group.length) * Math.PI * 2 - Math.PI / 2;
      positions.set(poi.id, [
        poi.lat + Math.sin(angle) * radius,
        poi.lon + Math.cos(angle) * radius * 1.25,
      ]);
    });
  }
  return positions;
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );

const tooltipFor = (poi: Poi, favorite: boolean) =>
  `<div class="mv-tooltip"><span class="mv-tooltip__type">${kindLabel(poi.kind)}</span><strong>${escapeHtml(
    poi.name,
  )}</strong><span>${formatElevation(poi.elevation)} · ${escapeHtml(poi.group)}</span>${
    poi.kind === "webcam"
      ? '<span class="mv-tooltip__live"><i></i> LIVE</span>'
      : ""
  }${
    favorite ? '<span class="mv-tooltip__fav">★ Nei preferiti</span>' : ""
  }</div>`;

const ICONS = {
  peak: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 20 6.5-11 4 6 2-3L21 20H3Z"/></svg>',
  hut: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>',
  webcam:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h3l2-3h6l2 3h3v13H4z"/><circle cx="12" cy="13" r="3.3"/></svg>',
};

const iconFor = (poi: Poi, selected = false, favorite = false): L.DivIcon => {
  const major = poi.kind === "peak" && (poi.elevation ?? 0) >= 2400;
  const classes = [
    "mv-pin",
    `mv-pin--${poi.kind}`,
    major ? "is-major" : "",
    selected ? "is-selected" : "",
    favorite ? "is-favorite" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return L.divIcon({
    className: "mv-marker",
    html: `<span class="${classes}"><span class="mv-pin__icon">${ICONS[poi.kind]}</span>${
      poi.kind === "webcam" ? '<span class="mv-pin__pulse"></span>' : ""
    }${favorite ? '<span class="mv-pin__fav" aria-hidden="true">★</span>' : ""}</span>`,
    iconSize: major ? [38, 38] : [32, 32],
    iconAnchor: major ? [19, 34] : [16, 29],
  });
};

const clusterIcon = (cluster: L.MarkerCluster): L.DivIcon => {
  const count = cluster.getChildCount();
  const size = count < 10 ? 38 : count < 100 ? 46 : 54;
  return L.divIcon({
    className: "mv-cluster",
    html: `<span>${count}</span>`,
    iconSize: [size, size],
  });
};

export function MapView({
  pois,
  selected,
  onSelect,
  favoriteIds,
  mapStyle,
  onMapStyleChange,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const poiMapRef = useRef<Map<string, Poi>>(new Map());
  const selectedIdRef = useRef<string | null>(selected?.id ?? null);
  const previousSelectedRef = useRef<string | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const onSelectRef = useRef(onSelect);
  const [toast, setToast] = useState<string | null>(null);

  const styleMeta = TILE_LAYERS[mapStyle];
  const markerPositions = useMemo(() => spreadDuplicates(pois), [pois]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: ABRUZZO_CENTER,
      zoom: 9,
      minZoom: 7,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
    });
    mapRef.current = map;
    map.attributionControl.setPrefix(false);
    map.on("click", () => onSelectRef.current(null));

    const layer = L.tileLayer(TILE_LAYERS.relief.url, {
      attribution: TILE_LAYERS.relief.attribution,
      maxZoom: TILE_LAYERS.relief.maxZoom,
      maxNativeZoom: 17,
    });
    layer.addTo(map);
    tileRef.current = layer;

    const fitAbruzzo = () => {
      map.fitBounds(ABRUZZO_BOUNDS, { padding: [14, 14], animate: false });
    };
    fitAbruzzo();

    L.control
      .scale({ position: "bottomleft", imperial: false, maxWidth: 110 })
      .addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileRef.current) map.removeLayer(tileRef.current);
    const layer = L.tileLayer(styleMeta.url, {
      attribution: styleMeta.attribution,
      maxZoom: styleMeta.maxZoom,
      maxNativeZoom: styleMeta.maxZoom,
    });
    layer.addTo(map);
    tileRef.current = layer;
  }, [styleMeta]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (clusterRef.current) map.removeLayer(clusterRef.current);

    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 48,
      disableClusteringAtZoom: 13,
      iconCreateFunction: clusterIcon,
    });

    markersRef.current.clear();
    poiMapRef.current.clear();

    for (const poi of pois) {
      poiMapRef.current.set(poi.id, poi);
      const position = markerPositions.get(poi.id) ?? [poi.lat, poi.lon];
      const favorite = favoriteIds.has(poi.id);
      const marker = L.marker(position, {
        icon: iconFor(poi, poi.id === selectedIdRef.current, favorite),
        title: poi.name,
        riseOnHover: true,
        keyboard: true,
        alt: `${kindLabel(poi.kind)}: ${poi.name}${favorite ? " · nei preferiti" : ""}`,
      });
      marker.on("click", () => onSelectRef.current(poi));
      marker.bindTooltip(tooltipFor(poi, favorite), {
        direction: "top",
        offset: [0, -30],
        opacity: 1,
        className: "mv-tooltip-shell",
        sticky: false,
      });
      markersRef.current.set(poi.id, marker);
      cluster.addLayer(marker);
    }

    cluster.addTo(map);
    clusterRef.current = cluster;

    return () => {
      if (clusterRef.current === cluster) {
        map.removeLayer(cluster);
        clusterRef.current = null;
      }
    };
  }, [pois, markerPositions]);

  useEffect(() => {
    selectedIdRef.current = selected?.id ?? null;
    const previous = previousSelectedRef.current;
    if (previous && previous !== selectedIdRef.current) {
      const marker = markersRef.current.get(previous);
      const poi = poiMapRef.current.get(previous);
      if (marker && poi) marker.setIcon(iconFor(poi, false, favoriteIds.has(poi.id)));
    }
    if (selectedIdRef.current) {
      const marker = markersRef.current.get(selectedIdRef.current);
      const poi = poiMapRef.current.get(selectedIdRef.current);
      if (marker && poi) marker.setIcon(iconFor(poi, true, favoriteIds.has(poi.id)));
    }
    previousSelectedRef.current = selectedIdRef.current;
  }, [selected, favoriteIds]);

  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      const poi = poiMapRef.current.get(id);
      if (!poi) continue;
      marker.setIcon(iconFor(poi, id === selectedIdRef.current, favoriteIds.has(id)));
      marker.setTooltipContent(tooltipFor(poi, favoriteIds.has(id)));
    }
  }, [favoriteIds]);

  useEffect(() => {
    if (!selected || !mapRef.current) return;
    const map = mapRef.current;
    const zoom = Math.max(map.getZoom(), 11);
    const isDesktop = window.matchMedia("(min-width: 1100px)").matches;
    const offsetX = isDesktop ? 220 : 0;
    const position = markerPositions.get(selected.id) ?? [selected.lat, selected.lon];
    const point = map.project(position, zoom);
    const center = map.unproject(point.add([offsetX, 0]), zoom);
    map.flyTo(center, zoom, { duration: 0.85 });
  }, [selected, markerPositions]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const locate = () => {
    const map = mapRef.current;
    if (!map) return;
    if (!navigator.geolocation) {
      setToast("La geolocalizzazione non è disponibile in questo browser.");
      return;
    }
    setToast("Sto cercando la tua posizione…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        map.flyTo([latitude, longitude], 12, { duration: 0.9 });
        if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);
        const marker = L.circleMarker([latitude, longitude], {
          radius: 8,
          color: "#f6f1e7",
          weight: 3,
          fillColor: "#2f6b8a",
          fillOpacity: 1,
          className: "mv-user-marker",
        }).addTo(map);
        marker.bindTooltip("Sei qui", {
          permanent: false,
          direction: "top",
          className: "mv-tooltip-shell",
          offset: [0, -10],
        });
        userMarkerRef.current = marker;
        setToast("Posizione trovata. Buona esplorazione!");
      },
      () => setToast("Non riesco a leggere la posizione. Controlla i permessi del browser."),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  };

  const resetView = () => {
    mapRef.current?.flyToBounds(ABRUZZO_BOUNDS, { padding: [14, 14], duration: 0.8 });
  };

  const nextStyle = () => {
    const index = MAP_STYLE_ORDER.indexOf(mapStyle);
    onMapStyleChange(MAP_STYLE_ORDER[(index + 1) % MAP_STYLE_ORDER.length]);
  };

  const visibleCount = useMemo(() => pois.length, [pois.length]);

  return (
    <div className="map-shell">
      <div
        ref={containerRef}
        className={`map-canvas map-canvas--${mapStyle}`}
        aria-label="Mappa interattiva dell'Abruzzo"
      />

      <div className="map-toolbar" role="toolbar" aria-label="Controlli mappa">
        <button
          type="button"
          className="map-tool map-tool--style"
          onClick={nextStyle}
          title="Cambia stile mappa"
          aria-label={`Stile mappa: ${styleMeta.label}. Cambia stile`}
        >
          <Layers size={17} aria-hidden="true" />
          <span>{styleMeta.label}</span>
        </button>
        <button type="button" className="map-tool" onClick={locate} title="Trova la mia posizione" aria-label="Trova la mia posizione">
          <LocateFixed size={18} aria-hidden="true" />
        </button>
        <button type="button" className="map-tool" onClick={resetView} title="Torna alla vista Abruzzo" aria-label="Torna alla vista Abruzzo">
          <Compass size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="map-zoom" role="group" aria-label="Zoom mappa">
        <button type="button" className="map-tool" onClick={() => mapRef.current?.zoomIn()} aria-label="Aumenta zoom">
          <Plus size={18} aria-hidden="true" />
        </button>
        <button type="button" className="map-tool" onClick={() => mapRef.current?.zoomOut()} aria-label="Riduci zoom">
          <Minus size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="map-legend" aria-label="Legenda mappa">
        <span><i className="legend-dot legend-dot--peak" /> Vette</span>
        <span><i className="legend-dot legend-dot--hut" /> Rifugi</span>
        <span><i className="legend-dot legend-dot--webcam" /> Webcam</span>
        <strong>{visibleCount} {visibleCount === 1 ? "luogo" : "luoghi"}</strong>
      </div>

      <div className="map-status">
        <span className="live-dot" aria-hidden="true" />
        Mappa live · Abruzzo
      </div>

      {toast && (
        <div className="map-toast" role="status">
          <RotateCcw size={15} aria-hidden="true" />
          {toast}
        </div>
      )}
    </div>
  );
}
