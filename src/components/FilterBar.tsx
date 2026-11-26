import { Camera, Home, Mountain, Star } from "lucide-react";
import type { PoiKind } from "../types";

interface FilterBarProps {
  counts: Record<PoiKind, number>;
  active: Record<PoiKind, boolean>;
  onToggle: (kind: PoiKind) => void;
  favoriteCount?: number;
  favoritesOnly?: boolean;
  onToggleFavorites?: () => void;
  compact?: boolean;
}

const filters: Array<{
  kind: PoiKind;
  label: string;
  icon: typeof Mountain;
}> = [
  { kind: "peak", label: "Vette", icon: Mountain },
  { kind: "hut", label: "Rifugi", icon: Home },
  { kind: "webcam", label: "Webcam", icon: Camera },
];

export function FilterBar({
  counts,
  active,
  onToggle,
  favoriteCount = 0,
  favoritesOnly = false,
  onToggleFavorites,
  compact = false,
}: FilterBarProps) {
  const showFavorites = onToggleFavorites && (favoriteCount > 0 || favoritesOnly);

  return (
    <div className={`filter-bar ${compact ? "filter-bar--compact" : ""}`} role="group" aria-label="Filtra i luoghi sulla mappa">
      {filters.map(({ kind, label, icon: Icon }) => (
        <button
          type="button"
          key={kind}
          className={`filter-chip filter-chip--${kind} ${active[kind] ? "is-active" : ""}`}
          aria-pressed={active[kind]}
          onClick={() => onToggle(kind)}
        >
          <span className="filter-chip__dot" aria-hidden="true" />
          <Icon size={15} strokeWidth={1.9} aria-hidden="true" />
          <span>{label}</span>
          <span className="filter-chip__count">{counts[kind]}</span>
        </button>
      ))}
      {showFavorites && (
        <button
          type="button"
          className={`filter-chip filter-chip--favorite ${favoritesOnly ? "is-active" : ""}`}
          aria-pressed={favoritesOnly}
          onClick={onToggleFavorites}
        >
          <Star size={15} strokeWidth={1.9} fill={favoritesOnly ? "currentColor" : "none"} aria-hidden="true" />
          <span>Preferiti</span>
          <span className="filter-chip__count">{favoriteCount}</span>
        </button>
      )}
    </div>
  );
}
