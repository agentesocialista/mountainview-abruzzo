import { ArrowUpRight, Camera, Home, Mountain, Sparkles, Star, X } from "lucide-react";
import type { DatasetMeta, Poi, PoiKind, WebcamPoi } from "../types";
import { formatElevation, kindLabel, pluralKind } from "../lib/geo";
import { FeatureCard } from "./FeatureCard";
import { FilterBar } from "./FilterBar";
import { LiveImage } from "./LiveImage";
import { Logo } from "./Logo";
import { SearchBox } from "./SearchBox";
import { uniqueWebcamSources, WebcamSourceLinks } from "./WebcamSources";

interface SidebarProps {
  peaks: Poi[];
  huts: Poi[];
  webcams: WebcamPoi[];
  meta: DatasetMeta | null;
  counts: Record<PoiKind, number>;
  activeTypes: Record<PoiKind, boolean>;
  onToggleType: (kind: PoiKind) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (poi: Poi) => void;
  favoritePois: Poi[];
  favoritesOnly: boolean;
  onToggleFavorites: () => void;
  onToggleFavorite: (id: string) => void;
  onClose?: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function Sidebar({
  peaks,
  huts,
  webcams,
  meta,
  counts,
  activeTypes,
  onToggleType,
  search,
  onSearchChange,
  onSelect,
  favoritePois,
  favoritesOnly,
  onToggleFavorites,
  onToggleFavorite,
  onClose,
  searchInputRef,
}: SidebarProps) {
  const kindIcon = (kind: Poi["kind"]) => {
    if (kind === "peak") return <Mountain size={15} aria-hidden="true" />;
    if (kind === "hut") return <Home size={15} aria-hidden="true" />;
    return <Camera size={15} aria-hidden="true" />;
  };
  const featuredPeaks = peaks.filter((poi) => poi.featured).slice(0, 3);
  const featuredHuts = huts.filter((poi) => poi.featured).slice(0, 2);
  const featured = [...featuredPeaks, ...featuredHuts];
  const liveCam =
    webcams.find((cam) => cam.name === "Campo Imperatore" && cam.elevation === 2137) ??
    webcams.find((cam) => cam.featured) ??
    webcams[0];
  const allPois = [...peaks, ...huts, ...webcams];

  return (
    <aside className="sidebar" aria-label="Esplora le montagne d'Abruzzo">
      <div className="sidebar__inner">
        <div className="sidebar__brand-row">
          <Logo />
          {onClose && (
            <button
              type="button"
              className="icon-button sidebar__close"
              onClick={onClose}
              aria-label="Chiudi pannello"
            >
              <X size={19} aria-hidden="true" />
            </button>
          )}
        </div>

        <section className="sidebar__hero">
          <p className="eyebrow">
            <span aria-hidden="true" /> Guida interattiva
          </p>
          <h1>
            Abruzzo
            <br />
            <em>tra cielo e roccia</em>
          </h1>
          <p className="sidebar__lede">
            Vette, rifugi e webcam live. Scegli una meta, leggi il meteo a 7 giorni e
            guarda l’orizzonte prima di partire.
          </p>

          <div className="stats" aria-label="Contenuti della guida">
            <div className="stat">
              <strong>{counts.peak}</strong>
              <span>{pluralKind("peak", counts.peak)}</span>
            </div>
            <div className="stat">
              <strong>{counts.hut}</strong>
              <span>{pluralKind("hut", counts.hut)}</span>
            </div>
            <div className="stat">
              <strong>{counts.webcam}</strong>
              <span>webcam</span>
            </div>
          </div>
        </section>

        <div className="sidebar__search">
          <SearchBox
            pois={allPois}
            value={search}
            onChange={onSearchChange}
            onSelect={onSelect}
            inputRef={searchInputRef}
          />
        </div>

        <div className="sidebar__filters">
          <FilterBar
            counts={counts}
            active={activeTypes}
            onToggle={onToggleType}
            favoriteCount={favoritePois.length}
            favoritesOnly={favoritesOnly}
            onToggleFavorites={onToggleFavorites}
            compact
          />
        </div>

        {favoritePois.length > 0 && (
          <section className="sidebar__section sidebar__favorites">
            <div className="section-heading">
              <div>
                <p className="eyebrow eyebrow--small">
                  <Star size={12} aria-hidden="true" /> Preferiti
                </p>
                <h2>I tuoi luoghi</h2>
              </div>
              <span className="section-heading__hint">Salvati su questo dispositivo</span>
            </div>
            <div className="favorite-list">
              {favoritePois.map((poi) => (
                <div className="favorite-row" key={poi.id}>
                  <button
                    type="button"
                    className="favorite-row__main"
                    onClick={() => onSelect(poi)}
                  >
                    <span className={`favorite-row__icon favorite-row__icon--${poi.kind}`}>
                      {kindIcon(poi.kind)}
                    </span>
                    <span className="favorite-row__text">
                      <strong>{poi.name}</strong>
                      <span>
                        {kindLabel(poi.kind)} · {formatElevation(poi.elevation)} · {poi.group}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="favorite-row__remove"
                    onClick={() => onToggleFavorite(poi.id)}
                    aria-label={`Rimuovi ${poi.name} dai preferiti`}
                    title="Rimuovi dai preferiti"
                  >
                    <Star size={15} fill="currentColor" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="sidebar__section">
          <div className="section-heading">
            <div>
              <p className="eyebrow eyebrow--small">
                <Sparkles size={12} aria-hidden="true" /> Selezione
              </p>
              <h2>In evidenza</h2>
            </div>
            <span className="section-heading__hint">Tocca per esplorare</span>
          </div>
          <div className="feature-list">
            {featured.map((poi) => (
              <FeatureCard key={poi.id} poi={poi} onClick={onSelect} />
            ))}
          </div>
        </section>

        {liveCam && (
          <section className="sidebar__live">
            <div className="section-heading">
              <div>
                <p className="eyebrow eyebrow--small">
                  <Camera size={12} aria-hidden="true" /> Occhi sulla montagna
                </p>
                <h2>Webcam in diretta</h2>
              </div>
              <span className="live-pill">
                <span className="live-dot" aria-hidden="true" /> LIVE
              </span>
            </div>
            <button
              type="button"
              className="live-feature"
              onClick={() => onSelect(liveCam)}
              aria-label={`Apri la webcam di ${liveCam.name}`}
            >
              <LiveImage
                src={liveCam.imageUrl ?? ""}
                alt={`Webcam di ${liveCam.name}`}
                compact
                className="live-feature__image"
              />
              <span className="live-feature__overlay">
                <span className="live-feature__label">Ora in diretta</span>
                <strong>{liveCam.name}</strong>
                <span>
                  {formatElevation(liveCam.elevation)} · {liveCam.group}
                </span>
              </span>
              <span className="live-feature__arrow" aria-hidden="true">
                <ArrowUpRight size={18} />
              </span>
            </button>
            <p className="sidebar__note">
              Immagini per gentile concessione dei rispettivi proprietari, fonte{" "}
              <WebcamSourceLinks sources={uniqueWebcamSources([liveCam])} />.
            </p>
          </section>
        )}

        <footer className="sidebar__footer">
          <div className="sidebar__footer-brand">
            <Logo compact />
            <span>Un balcone sull’Appennino.</span>
          </div>
          <p>
            Dati mappa <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>,
            contenuti <a href="https://it.wikipedia.org" target="_blank" rel="noreferrer">Wikipedia</a>,
            meteo <a href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo</a>.
          </p>
          {meta && (
            <p className="sidebar__footer-meta">
              {meta.counts.total} luoghi · aggiornato al{" "}
              {new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "long", year: "numeric" }).format(
                new Date(`${meta.generatedAt}T12:00:00`),
              )}
            </p>
          )}
        </footer>
      </div>
    </aside>
  );
}
