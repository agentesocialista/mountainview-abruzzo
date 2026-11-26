import { useCallback, useEffect, useState } from "react";
import {
  FAVORITES_STORAGE_KEY,
  parseFavoriteIds,
  serializeFavoriteIds,
} from "../lib/favorites";

function readFavorites(): Set<string> {
  if (typeof window === "undefined") return new Set<string>();
  try {
    return parseFavoriteIds(window.localStorage.getItem(FAVORITES_STORAGE_KEY));
  } catch {
    return new Set<string>();
  }
}

/** Preferiti dell'utente, persistiti in localStorage e sincronizzati tra schede. */
export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(readFavorites);

  useEffect(() => {
    try {
      window.localStorage.setItem(FAVORITES_STORAGE_KEY, serializeFavoriteIds(favoriteIds));
    } catch {
      // Spazio esaurito o localStorage disabilitato: l'app resta utilizzabile.
    }
  }, [favoriteIds]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === FAVORITES_STORAGE_KEY) setFavoriteIds(readFavorites());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  return { favoriteIds, toggleFavorite };
}
