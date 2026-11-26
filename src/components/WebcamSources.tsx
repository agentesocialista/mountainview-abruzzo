import { Fragment } from "react";
import type { WebcamPoi } from "../types";

export interface WebcamSource {
  label: string;
  url: string;
}

/** Restituisce le fonti delle webcam, senza duplicati, nell'ordine in cui compaiono. */
export function uniqueWebcamSources(webcams: WebcamPoi[]): WebcamSource[] {
  const sources: WebcamSource[] = [];
  const seen = new Set<string>();
  for (const webcam of webcams) {
    if (!webcam.sourceUrl || seen.has(webcam.sourceUrl)) continue;
    seen.add(webcam.sourceUrl);
    sources.push({ label: webcam.sourceLabel || webcam.sourceUrl, url: webcam.sourceUrl });
  }
  return sources;
}

interface WebcamSourceLinksProps {
  sources: WebcamSource[];
}

/** Etichette cliccabili delle fonti, da usare dentro una frase di attribuzione. */
export function WebcamSourceLinks({ sources }: WebcamSourceLinksProps) {
  return (
    <>
      {sources.map((source, index) => (
        <Fragment key={source.url}>
          {index > 0 && " · "}
          <a href={source.url} target="_blank" rel="noreferrer">
            {source.label}
          </a>
        </Fragment>
      ))}
    </>
  );
}
