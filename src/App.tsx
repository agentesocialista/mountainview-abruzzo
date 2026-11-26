import { Menu, Search, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MapStyle, Poi, PoiKind, WebcamPoi } from "./types";
import { useDataset } from "./hooks/useDataset";
import { FilterBar } from "./components/FilterBar";
import { DetailPanel } from "./components/DetailPanel";
import { Lightbox } from "./components/Lightbox";
import { Logo } from "./components/Logo";
import { MapView } from "./components/MapView";
import { Sidebar } from "./components/Sidebar";

const isMobile = () => window.matchMedia("(max-width: 1024px)").matches;

export default function App() {
  const { data, meta, loading, error } = useDataset();
  const [activeTypes, setActiveTypes] = useState<Record<PoiKind, boolean>>({
    peak: true,
    hut: true,
    webcam: true,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [mapStyle, setMapStyle] = useState<MapStyle>("relief");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lightbox, setLightbox] = useState<WebcamPoi | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const counts = useMemo<Record<PoiKind, number>>(
    () => ({
      peak: data?.peaks.length ?? 0,
      hut: data?.huts.length ?? 0,
      webcam: data?.webcams.length ?? 0,
    }),
    [data],
  );

  const selectedPoi = useMemo(
    () => (selectedId && data ? data.all.find((poi) => poi.id === selectedId) ?? null : null),
    [data, selectedId],
  );

  const visiblePois = useMemo(
    () => (data ? data.all.filter((poi) => activeTypes[poi.kind]) : []),
    [data, activeTypes],
  );

  const handleSelect = useCallback(
    (poi: Poi | null) => {
      if (!poi) {
        setSelectedId(null);
        return;
      }
      setActiveTypes((current) =>
        current[poi.kind] ? current : { ...current, [poi.kind]: true },
      );
      setSelectedId(poi.id);
      setSearch("");
      if (isMobile()) setSidebarOpen(false);
    },
    [],
  );

  const handleToggleType = useCallback(
    (kind: PoiKind) => {
      setActiveTypes((current) => {
        if (current[kind] && selectedPoi?.kind === kind) setSelectedId(null);
        return { ...current, [kind]: !current[kind] };
      });
    },
    [selectedPoi],
  );

  const openSidebar = (focusSearch = false) => {
    setSidebarOpen(true);
    if (focusSearch) {
      window.setTimeout(() => searchInputRef.current?.focus(), 260);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSidebar(true);
      }
      if (event.key === "Escape") {
        if (lightbox) setLightbox(null);
        else if (selectedId) setSelectedId(null);
        else if (sidebarOpen) setSidebarOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [lightbox, selectedId, sidebarOpen]);

  if (loading) {
    return (
      <div className="app-state app-state--loading">
        <Logo />
        <div className="loader" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p>Sto preparando la mappa dell’Abruzzo…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="app-state app-state--error">
        <Logo />
        <TriangleAlert size={34} aria-hidden="true" />
        <h1>La mappa non riesce a caricarsi</h1>
        <p>{error ?? "Errore sconosciuto."}</p>
        <button type="button" className="button" onClick={() => window.location.reload()}>
          Riprova
        </button>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className={`sidebar-wrap ${sidebarOpen ? "is-open" : ""}`}>
        <Sidebar
          peaks={data.peaks}
          huts={data.huts}
          webcams={data.webcams}
          meta={meta}
          counts={counts}
          activeTypes={activeTypes}
          onToggleType={handleToggleType}
          search={search}
          onSearchChange={setSearch}
          onSelect={handleSelect}
          onClose={() => setSidebarOpen(false)}
          searchInputRef={searchInputRef}
        />
      </div>

      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Chiudi pannello di esplorazione"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="map-area">
        <MapView
          pois={visiblePois}
          selected={selectedPoi}
          onSelect={handleSelect}
          mapStyle={mapStyle}
          onMapStyleChange={setMapStyle}
        />

        <header className="mobile-topbar">
          <button
            type="button"
            className="mobile-topbar__brand"
            onClick={() => openSidebar()}
            aria-label="Apri esplora"
          >
            <Logo compact />
          </button>
          <div className="mobile-topbar__actions">
            <button
              type="button"
              className="icon-button icon-button--glass"
              onClick={() => openSidebar(true)}
              aria-label="Cerca un luogo"
            >
              <Search size={19} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="icon-button icon-button--glass"
              onClick={() => openSidebar()}
              aria-label="Apri menu"
            >
              <Menu size={20} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="mobile-filters">
          <FilterBar
            counts={counts}
            active={activeTypes}
            onToggle={handleToggleType}
            compact
          />
        </div>

        {selectedPoi && (
          <DetailPanel
            poi={selectedPoi}
            webcams={data.webcams}
            onClose={() => setSelectedId(null)}
            onSelectWebcam={(webcam) => handleSelect(webcam)}
            onOpenLightbox={setLightbox}
          />
        )}
      </main>

      {lightbox && <Lightbox webcam={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
