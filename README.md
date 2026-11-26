# MountainView Abruzzo

Guida interattiva in italiano per escursionisti in Abruzzo: una mappa dinamica con vette, rifugi e webcam live. Selezionando un luogo si apre una scheda con altitudine, coordinate, descrizione, meteo a 7 giorni e le webcam più vicine.

Il sito è completamente statico: non richiede un backend e può essere pubblicato su qualsiasi hosting per file statici.

## Funzionalità

- Mappa Leaflet con tre stili (rilievo OpenTopoMap, satellite Esri, mappa chiara CARTO), clustering dei marker, tooltip, zoom, geolocalizzazione e pulsante "torna all'Abruzzo".
- Ricerca full-text (vette, rifugi, webcam) con scorciatoia `⌘K` / `Ctrl+K` e navigazione da tastiera.
- Filtri per tipologia, condivisi tra la barra desktop e quella mobile.
- Scheda di dettaglio con dati tecnici, previsioni Open-Meteo a 7 giorni e webcam nel raggio di 30 km.
- Webcam live con aggiornamento automatico ogni 2 minuti, ingrandimento a schermo intero e link alla fonte.
- Interfaccia responsive: pannello laterale su desktop, basso foglio su mobile.

## Stack

React 19, TypeScript, Vite, Leaflet + leaflet.markercluster, lucide-react, Vitest. I dati sono file JSON generati e serviti staticamente da `public/data/`; il meteo viene richiesto direttamente al browser a Open-Meteo.

## Avvio

```bash
npm install
npm run dev        # sviluppo, http://localhost:5173
npm test           # test unitari (Vitest)
npm run build      # type-check + build di produzione in dist/
npm run preview    # anteprima del build, http://localhost:4173
```

Per pubblicare sotto un sotto-percorso, imposta `base` in `vite.config.ts`; `useDataset` usa già `import.meta.env.BASE_URL`.

## Struttura

```
src/
  App.tsx               stato dell'app, filtri, selezione, scorciatoie
  components/           mappa, sidebar, scheda, meteo, webcam, lightbox
  hooks/                caricamento dataset e stato meteo
  lib/                  geometria, formattazione, client Open-Meteo
  styles/global.css     design system e layout responsive
scripts/
  build-data.mjs        genera i JSON da scripts/raw/
  fetch-*.mjs, geocode-webcams.mjs   raccolta dei dati grezzi
  raw/                  snapshot dei dati grezzi (versionati)
public/data/            JSON serviti all'app
```

## Dati e attribuzioni

I dati sono generati da `scripts/build-data.mjs` a partire dagli snapshot in `scripts/raw/`. Per rigenerarli:

```bash
npm run data:build
```

Per raccogliere di nuovo i dati grezzi (richiede rete) eseguire, nell'ordine, `scripts/fetch-wikipedia.mjs`, `scripts/fetch-wikidata-claims.mjs`, `scripts/geocode-webcams.mjs`, `scripts/fetch-elevations.mjs`, poi `npm run data:build`.

| Dato | Fonte | Licenza / nota |
| --- | --- | --- |
| Vette | [Wikipedia italiana](https://it.wikipedia.org) e [Wikidata](https://www.wikidata.org) | CC BY-SA; immagini da Wikimedia Commons con credito nella scheda |
| Rifugi | [OpenStreetMap](https://www.openstreetmap.org/copyright) (Overpass) e Wikipedia | ODbL / CC BY-SA |
| Confine regionale | OpenStreetMap (Nominatim) | ODbL |
| Quote mancanti | [Open-Meteo Elevation API](https://open-meteo.com/en/docs/elevation-api) | CC BY 4.0 |
| Previsioni meteo | [Open-Meteo Forecast API](https://open-meteo.com) | CC BY 4.0; richieste dal browser, cache 20 minuti |
| Webcam | [Ass. AQ Caput Frigoris](https://www.caputfrigoris.it/webcam_abruzzo.php) | Immagini dei rispettivi proprietari |

Le immagini delle webcam sono caricate direttamente da `webcam_proxy.php` del sito Caput Frigoris, con aggiornamento anti-cache. L'attribuzione alla fonte e ai proprietari è visibile nella sidebar, nelle schede, nelle webcam vicine e nel lightbox. **Prima di una pubblicazione commerciale o di un uso diverso da quello informativo, occorre ottenere l'autorizzazione dei proprietari delle immagini.**

### Note sulla qualità dei dati

- Le vette includono alcune cime di confine appena fuori dal poligono dell'Abruzzo (Monti della Laga, Montagne della Duchessa, Ernici): sono meta abituale degli escursionisti abruzzesi e quindi mantenute.
- 21 webcam hanno coordinate derivate dalla località e non dal punto esatto della camera; la scheda lo segnala con "Posizione indicativa, ricavata dalla località". I marker coincidenti vengono leggermente separati sulla mappa per restare cliccabili.
- Le quote possono mancare (`n.d.`) quando nessuna fonte le riporta: il meteo usa in quel caso la quota del modello Open-Meteo.

## Limitazioni

Le previsioni e le immagini webcam dipendono da servizi di terze parti: possono essere non disponibili temporaneamente o bloccate dal browser. L'app mostra un messaggio di errore dedicato per il meteo e continua a funzionare per il resto.
