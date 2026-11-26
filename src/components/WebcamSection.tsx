import { Camera, ExternalLink, Maximize2 } from "lucide-react";
import type { Poi, WebcamPoi } from "../types";
import { formatDistance, formatElevation, nearbyWebcams } from "../lib/geo";
import { LiveImage } from "./LiveImage";
import { uniqueWebcamSources, WebcamSourceLinks } from "./WebcamSources";

interface WebcamSectionProps {
  poi: Poi;
  webcams: WebcamPoi[];
  onSelectWebcam: (webcam: WebcamPoi) => void;
  onOpenLightbox: (webcam: WebcamPoi) => void;
}

export function WebcamSection({
  poi,
  webcams,
  onSelectWebcam,
  onOpenLightbox,
}: WebcamSectionProps) {
  const isWebcam = poi.kind === "webcam";
  const nearby = nearbyWebcams(poi, webcams, 4, 30);
  const title = isWebcam ? "Altre webcam vicine" : "Webcam nelle vicinanze";
  const sources = uniqueWebcamSources(nearby.map(({ webcam }) => webcam));

  return (
    <section className="detail-section webcam-section" aria-labelledby="webcam-title">
      <div className="section-heading section-heading--detail">
        <div>
          <p className="eyebrow eyebrow--small">
            <Camera size={12} aria-hidden="true" /> Occhi sulla montagna
          </p>
          <h2 id="webcam-title">{title}</h2>
        </div>
        <span className="webcam-count">
          {nearby.length} {nearby.length === 1 ? "webcam" : "webcam"}
        </span>
      </div>

      {nearby.length === 0 ? (
        <div className="webcam-empty">
          <Camera size={26} aria-hidden="true" />
          <p>Nessuna webcam censita nel raggio di 30 km.</p>
        </div>
      ) : (
        <div className="webcam-grid">
          {nearby.map(({ webcam, distanceKm }) => (
            <div className="webcam-card" key={webcam.id}>
              <div
                className="webcam-card__media"
                role="button"
                tabIndex={0}
                onClick={() => onSelectWebcam(webcam)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectWebcam(webcam);
                  }
                }}
                aria-label={`Apri la webcam di ${webcam.name}`}
              >
                <LiveImage
                  src={webcam.imageUrl ?? ""}
                  alt={`Webcam di ${webcam.name}`}
                  compact
                  className="webcam-card__image"
                />
                <span className="webcam-card__live">
                  <span className="live-dot" aria-hidden="true" /> LIVE
                </span>
                <span className="webcam-card__distance">{formatDistance(distanceKm)}</span>
                <button
                  type="button"
                  className="webcam-card__expand"
                  aria-label={`Ingrandisci la webcam di ${webcam.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenLightbox(webcam);
                  }}
                >
                  <Maximize2 size={14} aria-hidden="true" />
                </button>
              </div>
              <button
                type="button"
                className="webcam-card__body"
                onClick={() => onSelectWebcam(webcam)}
              >
                <strong>{webcam.name}</strong>
                <span>
                  {formatElevation(webcam.elevation)} · {webcam.group}
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="webcam-source">
        <span>
          Immagini live per gentile concessione dei rispettivi proprietari. Fonte:{" "}
          <WebcamSourceLinks sources={sources} />.
        </span>
        {sources.length === 1 && (
          <a href={sources[0].url} target="_blank" rel="noreferrer">
            Vedi tutte <ExternalLink size={13} aria-hidden="true" />
          </a>
        )}
      </div>
    </section>
  );
}
