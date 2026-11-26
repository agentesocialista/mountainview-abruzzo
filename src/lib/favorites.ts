export const FAVORITES_STORAGE_KEY = "mountainview-abruzzo:favorites:v1";

/** Legge un elenco di ID salvati, ignorando dati malformati o vecchi. */
export function parseFavoriteIds(raw: string | null): Set<string> {
  if (!raw) return new Set<string>();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(
      parsed.filter(
        (value): value is string => typeof value === "string" && value.length > 0,
      ),
    );
  } catch {
    return new Set<string>();
  }
}

/** Serializza gli ID in forma stabile per localStorage. */
export function serializeFavoriteIds(ids: Iterable<string>): string {
  return JSON.stringify([...ids]);
}
