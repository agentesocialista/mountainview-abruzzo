import { ExternalLink, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { WebcamPoi } from "../types";
import { formatElevation } from "../lib/geo";
import { LiveImage } from "./LiveImage";
import { uniqueWebcamSources, WebcamSourceLinks } from "./WebcamSources";

interface LightboxProps {
  webcam: WebcamPoi;
  onClose: () => void;
}

export function Lightbox({ webcam, onClose }: LightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Webcam di ${webcam.name}`}
      onClick={onClose}
    >
      <div className="lightbox__frame" onClick={(event) => event.stopPropagation()}>
        <div className="lightbox__header">
          <div>
            <span className="live-pill">
              <span className="live-dot" aria-hidden="true" /> LIVE
            </span>
            <h2>{webcam.name}</h2>
            <p>
              {formatElevation(webcam.elevation)} · {webcam.group}
              {webcam.province ? ` · ${webcam.province}` : ""}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="icon-button icon-button--glass lightbox__close"
            onClick={onClose}
            aria-label="Chiudi webcam"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <LiveImage
          src={webcam.imageUrl ?? ""}
          alt={`Webcam di ${webcam.name}`}
          autoRefresh
          className="lightbox__image"
        />
        <div className="lightbox__footer">
          <span>
            Immagini per gentile concessione dei rispettivi proprietari · Fonte{" "}
            <WebcamSourceLinks sources={uniqueWebcamSources([webcam])} />
          </span>
          <a href={webcam.sourceUrl} target="_blank" rel="noreferrer">
            Apri la fonte <ExternalLink size={13} aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}
