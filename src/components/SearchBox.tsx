import { Camera, Home, Mountain, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Poi } from "../types";
import { formatElevation, kindLabel, searchPois } from "../lib/geo";

interface SearchBoxProps {
  pois: Poi[];
  value: string;
  onChange: (value: string) => void;
  onSelect: (poi: Poi) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  autoFocus?: boolean;
  placeholder?: string;
}

const KindIcon = ({ kind }: { kind: Poi["kind"] }) => {
  if (kind === "peak") return <Mountain size={17} aria-hidden="true" />;
  if (kind === "hut") return <Home size={17} aria-hidden="true" />;
  return <Camera size={17} aria-hidden="true" />;
};

export function SearchBox({
  pois,
  value,
  onChange,
  onSelect,
  inputRef,
  autoFocus = false,
  placeholder = "Cerca una vetta, un rifugio, una webcam…",
}: SearchBoxProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const localRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const ref = inputRef ?? localRef;
  const results = useMemo(() => searchPois(pois, value), [pois, value]);

  useEffect(() => {
    setActiveIndex(0);
  }, [value]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const select = (poi: Poi) => {
    onSelect(poi);
    setOpen(false);
    ref.current?.blur();
  };

  return (
    <div className="search" ref={wrapperRef}>
      <div className={`search__field ${open && value.trim().length >= 2 ? "is-open" : ""}`}>
        <Search size={18} className="search__icon" aria-hidden="true" />
        <input
          ref={ref}
          type="search"
          value={value}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label="Cerca località"
          role="combobox"
          aria-expanded={open && value.trim().length >= 2}
          aria-controls="search-results"
          aria-autocomplete="list"
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((index) => Math.min(index + 1, results.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter" && results[activeIndex]) {
              event.preventDefault();
              select(results[activeIndex]);
            } else if (event.key === "Escape") {
              setOpen(false);
              ref.current?.blur();
            }
          }}
        />
        {value ? (
          <button
            type="button"
            className="search__clear"
            aria-label="Cancella ricerca"
            onClick={() => {
              onChange("");
              setOpen(false);
              ref.current?.focus();
            }}
          >
            <X size={15} aria-hidden="true" />
          </button>
        ) : (
          <kbd className="search__kbd">⌘K</kbd>
        )}
      </div>

      {open && value.trim().length >= 2 && (
        <div className="search-results" id="search-results" role="listbox">
          {results.length === 0 ? (
            <div className="search-results__empty">
              Nessun luogo trovato per “{value.trim()}”.
            </div>
          ) : (
            results.map((poi, index) => (
              <button
                type="button"
                key={poi.id}
                role="option"
                aria-selected={index === activeIndex}
                className={`search-result ${index === activeIndex ? "is-active" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(poi)}
              >
                <span className={`search-result__icon search-result__icon--${poi.kind}`}>
                  <KindIcon kind={poi.kind} />
                </span>
                <span className="search-result__text">
                  <strong>{poi.name}</strong>
                  <span>
                    {kindLabel(poi.kind)} · {formatElevation(poi.elevation)} · {poi.group}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
