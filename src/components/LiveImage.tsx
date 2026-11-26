import { Camera, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface LiveImageProps {
  src: string;
  alt: string;
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
  className?: string;
  compact?: boolean;
  onClick?: () => void;
}

const appendCacheBuster = (src: string, version: number) => {
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}t=${version}`;
};

export function LiveImage({
  src,
  alt,
  autoRefresh = false,
  refreshIntervalMs = 120_000,
  className,
  compact = false,
  onClick,
}: LiveImageProps) {
  const [version, setVersion] = useState(() => Date.now());
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const imageSrc = useMemo(() => appendCacheBuster(src, version), [src, version]);

  useEffect(() => {
    setVersion(Date.now());
    setStatus("loading");
    setUpdatedAt(null);
  }, [src]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = window.setInterval(() => {
      setVersion(Date.now());
      setStatus("loading");
    }, refreshIntervalMs);
    return () => window.clearInterval(interval);
  }, [autoRefresh, refreshIntervalMs]);

  const refresh = () => {
    setVersion(Date.now());
    setStatus("loading");
  };

  const time = updatedAt
    ? new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(updatedAt)
    : null;

  return (
    <div
      className={`live-image ${status === "error" ? "live-image--error" : ""} ${className ?? ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {status === "loading" && <div className="live-image__shimmer" aria-hidden="true" />}
      {status === "error" ? (
        <div className="live-image__fallback">
          <Camera size={compact ? 22 : 30} aria-hidden="true" />
          {!compact && <span>Webcam momentaneamente non disponibile</span>}
        </div>
      ) : (
        <img
          key={imageSrc}
          src={imageSrc}
          alt={alt}
          loading={compact ? "lazy" : "eager"}
          decoding="async"
          onLoad={() => {
            setStatus("loaded");
            setUpdatedAt(new Date());
          }}
          onError={() => setStatus("error")}
        />
      )}
      {!compact && status !== "error" && (
        <span className="live-image__live">
          <span className="live-dot" aria-hidden="true" /> LIVE
        </span>
      )}
      {!compact && (
        <div className="live-image__bar">
          <span>{time ? `Aggiornata alle ${time}` : "Caricamento immagine…"}</span>
          <button
            type="button"
            className="icon-button icon-button--glass"
            onClick={(event) => {
              event.stopPropagation();
              refresh();
            }}
            aria-label="Aggiorna webcam"
          >
            <RefreshCw size={15} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
