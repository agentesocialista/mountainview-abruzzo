import { useEffect, useState } from "react";
import type { Dataset, DatasetMeta } from "../types";

const base = import.meta.env.BASE_URL;

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${base}${path}`);
  if (!response.ok) throw new Error(`Impossibile caricare ${path} (${response.status})`);
  return (await response.json()) as T;
}

interface UseDatasetResult {
  data: Dataset | null;
  meta: DatasetMeta | null;
  loading: boolean;
  error: string | null;
}

export function useDataset(): UseDatasetResult {
  const [data, setData] = useState<Dataset | null>(null);
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchJson<Dataset["peaks"]>("data/mountains.json"),
      fetchJson<Dataset["huts"]>("data/refuges.json"),
      fetchJson<Dataset["webcams"]>("data/webcams.json"),
      fetchJson<DatasetMeta>("data/meta.json"),
    ])
      .then(([peaks, huts, webcams, metaData]) => {
        if (!active) return;
        setData({ peaks, huts, webcams, all: [...peaks, ...huts, ...webcams] });
        setMeta(metaData);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Errore di caricamento.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { data, meta, loading, error };
}
