import { ArrowUpRight, Camera, ExternalLink, MapPin, Mountain, Star, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Poi, WebcamPoi } from "../types";
import {
  formatCoordinates,
  formatElevation,
  kindLabel,
  osmLink,
} from "../lib/geo";
import { useWeather } from "../hooks/useWeather";
import { LiveImage } from "./LiveImage";
import { PoiImage } from "./PoiImage";
import { WeatherPanel } from "./WeatherPanel";
import { WebcamSection } from "./WebcamSection";

interface DetailPanelProps {
  poi: Poi;
  webcams: WebcamPoi[];
  onClose: () => void;
  onSelectWebcam: (webcam: WebcamPoi) => void;
  onOpenLightbox: (webcam: WebcamPoi) => void;
  favorite: boolean;
  onToggleFavorite: (id: string) => void;
  closing?: boolean;
}

export function DetailPanel({
  poi,
  webcams,
  onClose,
  onSelectWebcam,
  onOpenLightbox,
  favorite,
  onToggleFavorite,
  closing = false,
}: DetailPanelProps) {
  const weather = useWeather(poi);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isWebcam = poi.kind === "webcam";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [poi.id]);

  return (
    <aside
      className={`detail-panel detail-panel--${poi.kind}${closing ? " is-closing" : ""}`}
      aria-label={`Dettaglio di ${poi.name}`}
    >
      <div className="detail-panel__handle" aria-hidden="true" />
      <button
        type="button"
        className={`detail-favorite${favorite ? " is-active" : ""}`}
        onClick={() => onToggleFavorite(poi.id)}
        aria-pressed={favorite}
        aria-label={favorite ? `Rimuovi ${poi.name} dai preferiti` : `Aggiungi ${poi.name} ai preferiti`}
        title={favorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
      >
        <Star size={19} fill={favorite ? "currentColor" : "none"} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="detail-close"
        onClick={onClose}
        aria-label="Chiudi dettaglio"
      >
        <X size={20} aria-hidden="true" />
      </button>

      <div className="detail-scroll" ref={scrollRef}>
        <div className={`detail-hero detail-hero--${poi.kind}`}>
          {isWebcam ? (
            <LiveImage
              src={poi.imageUrl ?? ""}
              alt={`Webcam di ${poi.name}`}
              autoRefresh
              compact
              className="detail-hero__image"
            />
          ) : (
            <PoiImage src={poi.imageUrl} alt={poi.name} className="detail-hero__image" />
          )}
          <div className="detail-hero__shade" />
          <div className="detail-hero__content">
            <span className={`type-badge type-badge--${poi.kind}`}>
              {isWebcam && <span className="live-dot" aria-hidden="true" />}
              {kindLabel(poi.kind)}
            </span>
            <h1>{poi.name}</h1>
            <p>
              <Mountain size={15} aria-hidden="true" />
              {formatElevation(poi.elevation)}
              <span className="dot-separator" aria-hidden="true">·</span>
              {poi.group}
            </p>
          </div>
          {isWebcam && (
            <span className="detail-hero__live">
              <span className="live-dot" aria-hidden="true" /> LIVE
            </span>
          )}
        </div>

        <div className="detail-body">
          {isWebcam && (
            <div className="live-webcam-bar">
              <div>
                <span className="live-pill">
                  <span className="live-dot" aria-hidden="true" /> In diretta
                </span>
                <span>Aggiornamento automatico ogni 2 minuti</span>
              </div>
              <button
                type="button"
                className="button button--ghost button--small"
                onClick={() => onOpenLightbox(poi as WebcamPoi)}
              >
                <Camera size={15} aria-hidden="true" /> Schermo intero
              </button>
            </div>
          )}

          <div className="detail-meta-grid">
            <div className="meta-item">
              <span>Altitudine</span>
              <strong>{formatElevation(poi.elevation)}</strong>
            </div>
            <div className="meta-item">
              <span>Tipo</span>
              <strong>{kindLabel(poi.kind)}</strong>
            </div>
            <div className="meta-item">
              <span>Gruppo montuoso</span>
              <strong>{poi.group}</strong>
            </div>
            <div className="meta-item">
              <span>{poi.province ? "Provincia" : "Regione"}</span>
              <strong>{poi.province ?? "Abruzzo"}</strong>
            </div>
            <div className="meta-item meta-item--wide">
              <span>Coordinate</span>
              <a href={osmLink(poi.lat, poi.lon)} target="_blank" rel="noreferrer">
                <MapPin size={14} aria-hidden="true" />
                {formatCoordinates(poi.lat, poi.lon)}
                <ArrowUpRight size={13} aria-hidden="true" />
              </a>
            </div>
            {isWebcam && (
              <div className="meta-item meta-item--wide">
                <span>Posizione webcam</span>
                <strong className="meta-item__muted">
                  {poi.accuracy === "approx"
                    ? "Posizione indicativa, ricavata dalla località"
                    : "Posizione della località"}
                </strong>
              </div>
            )}
          </div>

          <p className="detail-description">{poi.description}</p>

          <WeatherPanel
            poi={poi}
            data={weather.data}
            loading={weather.loading}
            error={weather.error}
            onRefresh={weather.refresh}
          />

          <WebcamSection
            poi={poi}
            webcams={webcams}
            onSelectWebcam={onSelectWebcam}
            onOpenLightbox={onOpenLightbox}
          />

          <footer className="detail-footer">
            <span>
              Fonte:{" "}
              <a href={poi.sourceUrl} target="_blank" rel="noreferrer">
                {poi.sourceLabel} <ExternalLink size={12} aria-hidden="true" />
              </a>
              {poi.imageCredit && <> · Immagine: {poi.imageCredit}</>}
            </span>
            {isWebcam && (
              <span>
                Le immagini sono dei rispettivi proprietari.{" "}
                <a href={poi.sourceUrl} target="_blank" rel="noreferrer">
                  Apri la fonte <ExternalLink size={12} aria-hidden="true" />
                </a>
              </span>
            )}
          </footer>
        </div>
      </div>
    </aside>
  );
}
