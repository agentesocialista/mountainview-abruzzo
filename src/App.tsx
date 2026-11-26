import { Menu, Search, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MapStyle, Poi, PoiKind, WebcamPoi } from "./types";
import { useDataset } from "./hooks/useDataset";
import { useFavorites } from "./hooks/useFavorites";
import { FilterBar } from "./components/FilterBar";
import { DetailPanel } from "./components/DetailPanel";
import { Lightbox } from "./components/Lightbox";
import { Logo } from "./components/Logo";
import { MapView } from "./components/MapView";
import { Sidebar } from "./components/Sidebar";

const isMobile = () => window.matchMedia("(max-width: 1024px)").matches;

export default function App() {
  const { data, meta, loading, error } = useDataset();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const [favoritesOnly, setFavoritesOnly] = useState(false);
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
  const [closingDetail, setClosingDetail] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const closeTimer = useRef<number | null>(null);

  const cancelDetailClose = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setClosingDetail(false);
  }, []);

  const closeDetail = useCallback(() => {
    if (closeTimer.current !== null) return;
    setClosingDetail(true);
    closeTimer.current = window.setTimeout(() => {
      setSelectedId(null);
      setClosingDetail(false);
      closeTimer.current = null;
    }, 180);
  }, []);

  useEffect(() => () => cancelDetailClose(), [cancelDetailClose]);

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

  const favoritePois = useMemo(
    () => (data ? data.all.filter((poi) => favoriteIds.has(poi.id)) : []),
    [data, favoriteIds],
  );

  const visiblePois = useMemo(
    () =>
      data
        ? data.all.filter(
            (poi) => activeTypes[poi.kind] && (!favoritesOnly || favoriteIds.has(poi.id)),
          )
        : [],
    [data, activeTypes, favoritesOnly, favoriteIds],
  );

  useEffect(() => {
    if (favoritePois.length === 0) setFavoritesOnly(false);
  }, [favoritePois.length]);

  const handleSelect = useCallback(
    (poi: Poi | null) => {
      cancelDetailClose();
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
    [cancelDetailClose],
  );

  const handleToggleType = useCallback(
    (kind: PoiKind) => {
      setActiveTypes((current) => {
        if (current[kind] && selectedPoi?.kind === kind) closeDetail();
        return { ...current, [kind]: !current[kind] };
      });
    },
    [selectedPoi, closeDetail],
  );

  const handleToggleFavorite = useCallback(
    (id: string) => {
      const wasFavorite = favoriteIds.has(id);
      toggleFavorite(id);
      if (favoritesOnly && wasFavorite && id === selectedId) closeDetail();
    },
    [favoriteIds, toggleFavorite, favoritesOnly, selectedId, closeDetail],
  );

  const handleToggleFavoritesOnly = useCallback(() => {
    setFavoritesOnly((current) => !current);
  }, []);

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
        else if (selectedId) closeDetail();
        else if (sidebarOpen) setSidebarOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [lightbox, selectedId, sidebarOpen, closeDetail]);

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
          favoritePois={favoritePois}
          favoritesOnly={favoritesOnly}
          onToggleFavorites={handleToggleFavoritesOnly}
          onToggleFavorite={handleToggleFavorite}
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
          favoriteIds={favoriteIds}
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
            favoriteCount={favoritePois.length}
            favoritesOnly={favoritesOnly}
            onToggleFavorites={handleToggleFavoritesOnly}
            compact
          />
        </div>

        {selectedPoi && (
          <DetailPanel
            poi={selectedPoi}
            webcams={data.webcams}
            onClose={closeDetail}
            onSelectWebcam={(webcam) => handleSelect(webcam)}
            onOpenLightbox={setLightbox}
            favorite={favoriteIds.has(selectedPoi.id)}
            onToggleFavorite={handleToggleFavorite}
            closing={closingDetail}
          />
        )}
      </main>

      {lightbox && <Lightbox webcam={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
