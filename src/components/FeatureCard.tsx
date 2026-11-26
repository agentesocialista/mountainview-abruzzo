import { ArrowUpRight } from "lucide-react";
import type { Poi } from "../types";
import { formatElevation, kindLabel } from "../lib/geo";
import { PoiImage } from "./PoiImage";

interface FeatureCardProps {
  poi: Poi;
  onClick: (poi: Poi) => void;
}

export function FeatureCard({ poi, onClick }: FeatureCardProps) {
  return (
    <button
      type="button"
      className={`feature-card feature-card--${poi.kind}`}
      onClick={() => onClick(poi)}
    >
      <span className="feature-card__media">
        <PoiImage src={poi.imageUrl} alt={poi.name} className="feature-card__image" />
        <span className={`type-badge type-badge--${poi.kind}`}>
          {kindLabel(poi.kind)}
        </span>
      </span>
      <span className="feature-card__body">
        <span className="feature-card__top">
          <strong>{poi.name}</strong>
          <ArrowUpRight size={16} aria-hidden="true" />
        </span>
        <span className="feature-card__meta">
          {formatElevation(poi.elevation)} · {poi.group}
        </span>
      </span>
    </button>
  );
}
