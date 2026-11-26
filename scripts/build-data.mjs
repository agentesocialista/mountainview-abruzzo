import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const raw = (name) => JSON.parse(fs.readFileSync(path.join(root, "scripts/raw", name), "utf8"));
const outDir = path.join(root, "public/data");
fs.mkdirSync(outDir, { recursive: true });

const wikiMountains = raw("wiki_mountains.json");
const wikiRefuges = raw("wiki_refuges.json");
const claims = raw("wikidata_claims.json");
const hutsRaw = raw("huts.json");
const webcamsRaw = raw("webcams_geocoded.json");
const abruzzo = raw("abruzzo.json")[0]?.geojson;
const elevationCache = raw("elevations.json");

const cachedElevation = (lat, lon) => {
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  return elevationCache[`${lat.toFixed(5)},${lon.toFixed(5)}`] ?? null;
};

const slugify = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const normalizeName = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(rifugio|bivacco|capanna|monte|pizzo|cima|del|della|dei|di|il|la|le|lo|d|l)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInGeometry(lon, lat, geometry) {
  if (!geometry) return true;
  if (geometry.type === "Polygon") {
    return geometry.coordinates.some((ring) => pointInRing(lon, lat, ring));
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) =>
      polygon.some((ring) => pointInRing(lon, lat, ring)),
    );
  }
  return true;
}

const inAbruzzo = (lat, lon) => pointInGeometry(lon, lat, abruzzo);

function groupOf(lat, lon, elevation = null) {
  if (elevation !== null && elevation <= 300) return "Costa Adriatica";
  if (lat >= 42.18 && lat <= 42.29 && lon >= 13.46 && lon <= 13.64) return "Altopiano delle Rocche";
  if (lat >= 42.3 && lat <= 42.59 && lon >= 13.32 && lon <= 13.82) return "Gran Sasso d'Italia";
  if (lat >= 42.55 && lat <= 42.95 && lon >= 13.22 && lon <= 13.82) return "Monti della Laga";
  if (lat >= 41.95 && lat <= 42.33 && lon >= 13.87 && lon <= 14.32) return "Majella";
  if (lat >= 41.98 && lat <= 42.3 && lon >= 13.22 && lon <= 13.68) return "Sirente-Velino";
  if (lat >= 41.58 && lat <= 41.97 && lon >= 13.32 && lon <= 14.08) return "Parco Nazionale d'Abruzzo";
  if (lat >= 41.58 && lat <= 41.9 && lon >= 13.78 && lon <= 14.3) return "Monti della Meta";
  if (lat >= 41.68 && lat <= 42.06 && lon >= 13.25 && lon <= 14.02) return "Monti Marsicani";
  if (lat >= 42.58 && lat <= 42.86 && lon >= 13.52 && lon <= 13.92) return "Monti Gemelli";
  if (lat >= 41.78 && lon >= 14.08) return "Monti Frentani";
  if (lat >= 42.2 && lat <= 42.55 && lon >= 13.7 && lon <= 14.12) return "Valle del Pescara";
  return "Appennino Abruzzese";
}

const PEAK_DESCRIPTIONS = {
  "Corno Grande":
    "La vetta più alta degli Appennini e il simbolo del Gran Sasso. Dalla cima lo sguardo corre alla Majella, ai Monti della Laga e, nelle giornate limpide, fino al mare Adriatico.",
  "Corno Piccolo":
    "La cima più tecnica del Gran Sasso, con guglie calcaree e pareti che hanno scritto la storia dell'alpinismo abruzzese. Una meta per escursionisti esperti.",
  "Monte Amaro":
    "Il tetto della Majella, un gigante calcareo isolato e selvaggio. La salita è lunga e severa, ma la vista sull'Altopiano delle Cinquemiglia ripaga ogni passo.",
  "Monte Velino":
    "La vetta più alta del gruppo Sirente-Velino, affacciata su Campo Felice e sulla piana del Fucino. Un balcone naturale sull'Appennino centrale.",
  "Monte Sirente":
    "Cima simbolo dell'Altipiano delle Rocche, riconoscibile dalla lunga cresta erbosa. Il panorama spazia dal Gran Sasso alla Majella.",
  "Monte Camicia":
    "Imponente parete orientale del Gran Sasso, con ghiaioni e canaloni che dominano Campo Imperatore. Una delle salite più scenografiche dell'Appennino.",
  "Pizzo Intermesoli":
    "La cima più alta della dorsale orientale del Gran Sasso. Un ambiente aspro e panoramico, con vista sulle valli del Vomano e del Mavone.",
  "Monte Marsicano":
    "La montagna più alta del Parco Nazionale d'Abruzzo, immersa nelle faggete dell'Alto Sangro. Un luogo di biodiversità e silenzi profondi.",
  "Cima delle Murelle":
    "La regina della Majella orientale, con pareti vertiginose e un profilo inconfondibile. Meta di alpinisti e fotografi, domina l'altopiano di Campo di Giove.",
  "Monte Gorzano":
    "Il tetto dei Monti della Laga, al confine tra Abruzzo, Lazio e Marche. Dalla vetta si aprono viste sull'intero crinale appenninico.",
  "Monte Meta":
    "Un balcone sul Parco Nazionale d'Abruzzo, al confine tra Abruzzo e Molise. Le faggete e le praterie d'altitudine ne fanno una meta molto amata.",
  "Monte Genzana":
    "Un belvedere naturale sull'Alto Sangro e sul lago di Scanno. Le sue pendici custodiscono faggete, sorgenti e antichi tratturi.",
};

const HUT_DESCRIPTIONS = {
  "Rifugio Duca degli Abruzzi":
    "Storico rifugio ai piedi del Corno Grande, sul Monte Portella. Punto di partenza per le vie normali e per le traversate del Gran Sasso.",
  "Rifugio Carlo Franchetti":
    "Rifugio d'alta quota nel Vallone delle Cornacchie, base classica per la salita al Corno Grande e alla cresta del Gran Sasso.",
  "Rifugio Giuseppe Garibaldi":
    "Rifugio del Gran Sasso affacciato su Campo Imperatore, punto di appoggio per l'Alta Via e per le escursioni sul versante teramano.",
  "Rifugio Bruno Pomilio":
    "Il rifugio più alto della Majella, sulla Majelletta. Da qui partono itinerari per le Murelle, il Blockhaus e il crinale della Majella.",
  "Rifugio Vincenzo Sebastiani":
    "Rifugio nel cuore del gruppo Velino, base per salire sulla vetta e per esplorare l'altopiano di Campo Felice.",
  "Rifugio Capanna di Sevice":
    "Rifugio d'alta quota nel gruppo Velino, incastonato tra le praterie di quota. Una tappa perfetta per chi cerca silenzio e panorami aperti.",
  "Rifugio Fonte Vetica":
    "Rifugio ai piedi della parete orientale del Gran Sasso, punto di sosta per le escursioni a Campo Imperatore e al Monte Camicia.",
  "Rifugio Il Ceppo":
    "Rifugio nei boschi dei Monti della Laga, base per i sentieri del Ceppo e per le cascate della zona.",
  "Rifugio La Madonnina":
    "Rifugio ai Prati di Tivo, ai piedi della parete nord del Corno Grande. Un punto di partenza iconico per il Gran Sasso.",
  "Rifugio Racollo":
    "Rifugio a Campo Imperatore, tra le antiche masserie dell'altopiano. Ottimo appoggio per trekking, MTB e osservazione del cielo.",
  "Rifugio Telespazio":
    "Rifugio sul versante aquilano del Gran Sasso, vicino ai piani di Campo Imperatore e alle vie del Corno Grande.",
  "Bivacco Andrea Bafile":
    "Bivacco d'alta quota sul Gran Sasso, dedicato all'alpinista aquilano. Punto di appoggio per traversate e salite tecniche.",
  "Rifugio Coppo dell'Orso":
    "Rifugio immerso nei boschi del Parco Nazionale d'Abruzzo, punto di partenza per sentieri tra faggete e praterie.",
  "Rifugio Casale da Monte":
    "Rifugio nel gruppo Sirente-Velino, base per escursioni tra boschi, altopiani e antiche vie della transumanza.",
  "Rifugio Antonella Panepucci Alessandri":
    "Rifugio nel Parco Nazionale del Gran Sasso e Monti della Laga, affacciato sulle valli del versante aquilano.",
};

const PEAK_FEATURED = new Set([
  "Corno Grande",
  "Corno Piccolo",
  "Monte Amaro",
  "Monte Velino",
  "Monte Sirente",
  "Monte Camicia",
  "Pizzo Intermesoli",
  "Monte Marsicano",
  "Cima delle Murelle",
  "Monte Gorzano",
  "Monte Meta",
  "Monte Genzana",
]);

const HUT_FEATURED = new Set([
  "Rifugio Duca degli Abruzzi",
  "Rifugio Carlo Franchetti",
  "Rifugio Giuseppe Garibaldi",
  "Rifugio Bruno Pomilio",
  "Rifugio Vincenzo Sebastiani",
  "Rifugio Capanna di Sevice",
  "Rifugio Fonte Vetica",
  "Rifugio Il Ceppo",
  "Rifugio La Madonnina",
  "Rifugio Racollo",
  "Rifugio Telespazio",
  "Bivacco Andrea Bafile",
  "Rifugio Coppo dell'Orso",
  "Rifugio Casale da Monte",
  "Rifugio Antonella Panepucci Alessandri",
]);

const WEBCAM_FEATURED = new Set([
  "a1",
  "a2",
  "a7",
  "a10",
  "a21",
  "a36",
  "a53",
  "a61",
  "a62",
  "a63",
  "a94",
  "a96",
]);

const peakElevationOverrides = {
  "Monte San Franco": 2132,
  "Monte Ginepro": 2104,
  "Monte San Rocco": 1810,
  "Monte Rotondo (Borgorose)": 1905,
  "Monte Crepacuore": 1997,
  "Peschio delle Ciavole": 2110,
  "Peschio delle Cornacchie": 2350,
  "Monte Ortara": 1925,
  "Monte Prato (Ernici)": 2064,
  "Monte Cappello (Ernici)": 2185,
  "Monte Brecciaro": 2180,
  "Picco La Rocca": 2100,
  "Monte la Rocca": 2000,
  "Monte della Strega": 1800,
  "Monte Genzana": 2170,
  "Monte Bolza": 1911,
  "Monte Cappucciata": 1802,
  "Monte Pelone Meridionale": 2212,
  "Cima della Laghetta": 2369,
  "Cima Mammarosa": 1958,
};

const allowedPeak = /^(Monte|Pizzo|Cima|Corno|Punta|Picco|Peschio|Toppe|Torretta|Rocca|Masso|Colle|La|Il|Le|Serra|Cresta|Blockhaus)\b/i;
const excludedPeak = /^(Monti|Montagne|Gruppo|Catena|Massiccio|Altopiano|Valle|Parco|Riserva|Lago|Passo|Gola|Piano|Serre|Cima Blockhaus?)\b/i;

const provinceFromCategory = (category = "") => {
  if (/Aquila/.test(category)) return "L'Aquila";
  if (/Teramo/.test(category)) return "Teramo";
  if (/Pescara/.test(category)) return "Pescara";
  if (/Chieti/.test(category)) return "Chieti";
  return undefined;
};

const peakRecords = wikiMountains
  .map((page) => {
    const entity = claims[page.qid];
    const coord = entity?.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
    const elevClaim = entity?.claims?.P2044?.[0]?.mainsnak?.datavalue?.value;
    const lat = coord?.latitude ?? page.lat;
    const lon = coord?.longitude ?? page.lon;
    const elevation =
      elevClaim?.amount != null
        ? Math.round(Number(elevClaim.amount))
        : page.elevation ??
          peakElevationOverrides[page.title] ??
          cachedElevation(lat, lon);
    return { page, lat, lon, elevation };
  })
  .filter(({ page, lat, lon }) => {
    if (lat === null || lon === null) return false;
    return allowedPeak.test(page.title) && !excludedPeak.test(page.title);
  })
  .map(({ page, lat, lon, elevation }) => {
    const group = groupOf(lat, lon, elevation);
    const description =
      PEAK_DESCRIPTIONS[page.title] ??
      `${page.title} è una cima del ${group}${elevation ? ` che raggiunge i ${elevation} m` : ""}. Una meta panoramica per escursioni e trekking in Abruzzo.`;
    return {
      id: `peak-${slugify(page.title)}`,
      kind: "peak",
      name: page.title,
      lat,
      lon,
      elevation,
      group,
      province: provinceFromCategory(page.category),
      description,
      imageUrl: page.image ?? null,
      imageCredit: page.image ? "Wikipedia / Wikimedia Commons" : null,
      sourceUrl: page.sourceUrl,
      sourceLabel: "Wikipedia",
      tags: ["Vetta", group],
      featured: PEAK_FEATURED.has(page.title),
    };
  });

const webcamName = (label) =>
  label
    .replace(/^RdM\s*\[(.+?)\]$/i, "$1 · RdM")
    .replace(/^(.+?)\s*\[(.+?)\]$/, "$1 · $2")
    .replace(/\s*\(.*?\)\s*/g, (match) => (match.includes("AP") ? "" : match))
    .replace(/\s+/g, " ")
    .trim();

const webcamOverrides = {
  a15: { lat: 42.4775046, lon: 13.4591216 },
  a22: { lat: 42.1761605, lon: 13.5160862 },
  a23: { lat: 42.1761605, lon: 13.5160862 },
  a28: { lat: 41.861, lon: 14.061 },
  a29: { lat: 42.2349095, lon: 13.5346202 },
  a30: { lat: 42.2557437, lon: 13.5110986 },
  a45: { lat: 42.351, lon: 13.398 },
  a57: { lat: 42.032, lon: 13.463 },
  a58: { lat: 41.94, lon: 13.42 },
  a62: { lat: 42.4998, lon: 13.5596 },
  a65: { lat: 42.4998, lon: 13.5596 },
  a77: { lat: 42.65, lon: 13.83 },
  a78: { lat: 42.65, lon: 13.83 },
  a83: { lat: 42.75, lon: 13.95 },
  a85: { lat: 42.36, lon: 13.85 },
  a92: { lat: 42.16, lon: 14.0 },
  a94: { lat: 42.160735, lon: 14.132572 },
  a103: { lat: 42.22, lon: 14.2 },
  a105: { lat: 42.2305, lon: 14.3908, elevation: 260 },
  a108: { lat: 42.351, lon: 14.167 },
  a109: { lat: 42.351, lon: 14.167 },
};

const abruzzoProvinces = new Set([
  "Provincia de L'Aquila",
  "Provincia di Teramo",
  "Provincia di Pescara",
  "Provincia di Chieti",
]);

const webcamRecords = webcamsRaw
  .filter((item) => abruzzoProvinces.has(item.province.trim()))
  .map((item) => {
    const override = webcamOverrides[item.key] ?? {};
    const lat = override.lat ?? item.lat;
    const lon = override.lon ?? item.lon;
    const elevation = override.elevation ?? item.elevation ?? cachedElevation(lat, lon);
    const name = webcamName(item.label);
    const province = item.province.trim().replace(/^Provincia (de |di )/, "").trim();
    const group = groupOf(lat, lon, elevation);
    return {
      id: `webcam-${item.key}`,
      kind: "webcam",
      name,
      lat,
      lon,
      elevation,
      group,
      province,
      description: `Vista in diretta da ${name}${elevation ? `, a ${elevation} m` : ""}. L'immagine viene aggiornata automaticamente dalla rete di monitoraggio dell'Associazione AQ Caput Frigoris.`,
      imageUrl: `https://www.caputfrigoris.it/webcam_proxy.php?k=${item.key}`,
      imageCredit: "Ass. AQ Caput Frigoris",
      sourceUrl: "https://www.caputfrigoris.it/webcam_abruzzo.php",
      sourceLabel: "Caput Frigoris",
      tags: ["Webcam live", group],
      featured: WEBCAM_FEATURED.has(item.key),
      webcamKey: item.key,
      accuracy: item.geocoded && !override.lat ? "locality" : "approx",
    };
  });

// Webcam del Rifugio Vincenzo Sebastiani, pubblicata dall'osservatorio
// meteorologico MeteoProject / CAI Roma (non presente nell'elenco Caput Frigoris).
const sebastianiLat = 42.179;
const sebastianiLon = 13.392;
const sebastianiGroup = groupOf(sebastianiLat, sebastianiLon, 2102);
webcamRecords.push({
  id: "webcam-sebastiani",
  kind: "webcam",
  name: "Rifugio Vincenzo Sebastiani",
  lat: sebastianiLat,
  lon: sebastianiLon,
  elevation: 2102,
  group: sebastianiGroup,
  province: "L'Aquila",
  description:
    "Vista in diretta dal Rifugio Vincenzo Sebastiani, al Colletto di Pezza nel cuore del Sirente-Velino. L'immagine è pubblicata dall'osservatorio meteorologico MeteoProject / CAI Roma.",
  imageUrl: "https://stazioni.meteoproject.it/webcam/rifugiosebastiani/sebastiani.jpg",
  imageCredit: "MeteoProject / CAI Roma",
  sourceUrl: "https://stazioni.meteoproject.it/dati/rifugiosebastiani/webcam.php",
  sourceLabel: "MeteoProject · CAI Roma",
  tags: ["Webcam live", sebastianiGroup],
  featured: true,
  webcamKey: "sebastiani",
  accuracy: "locality",
});

const wikiRefugeByKey = new Map(
  wikiRefuges.map((item) => [normalizeName(item.title.replace(/\s*\(.*?\)\s*/g, "")), item]),
);

const osmHutCandidates = hutsRaw.elements
  .map((element) => {
    const tags = element.tags ?? {};
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    const name = tags.name?.trim();
    return { element, tags, lat, lon, name };
  })
  .filter(({ lat, lon, name, tags }) => {
    if (!name || lat === null || lon === null) return false;
    if (!inAbruzzo(lat, lon)) return false;
    if (!/^(Rifugio|Rif\.|Bivacco|Capanna|Stazzo|Baita|Ricovero|Casale|Casa|Chalet)\b/i.test(name)) {
      return false;
    }
    if (/^(Rifugio|Bivacco|Capanna)$/i.test(name)) return false;
    if (/bed and breakfast|agriturismo|ristorante|albergo/i.test(tags.tourism ?? "")) return false;
    return true;
  });

const seenHuts = new Set();
const hutRecords = [];
for (const { element, tags, lat, lon, name } of osmHutCandidates) {
  const key = `${normalizeName(name)}-${lat.toFixed(3)}-${lon.toFixed(3)}`;
  if (seenHuts.has(key)) continue;
  seenHuts.add(key);
  const wiki = wikiRefugeByKey.get(normalizeName(name));
  const elevation = tags.ele
    ? Number(String(tags.ele).replace(/[^\d.]/g, "")) || null
    : wiki?.elevation ?? cachedElevation(lat, lon);
  const group = groupOf(lat, lon, elevation);
  const description =
    HUT_DESCRIPTIONS[name] ??
    `${name} è un punto di appoggio nel ${group}${elevation ? `, a ${elevation} m` : ""}. Una base utile per escursioni, trekking e traversate in Abruzzo.`;
  hutRecords.push({
    id: `hut-osm-${element.type}-${element.id}`,
    kind: "hut",
    name,
    lat,
    lon,
    elevation,
    group,
    province: undefined,
    description,
    imageUrl: wiki?.image ?? null,
    imageCredit: wiki?.image ? "Wikipedia / Wikimedia Commons" : null,
    sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    sourceLabel: "OpenStreetMap",
    tags: ["Rifugio", group],
    featured: HUT_FEATURED.has(name),
  });
}

for (const refuge of wikiRefuges) {
  const name = refuge.title.replace(/\s*\(.*?\)\s*/g, "");
  const key = normalizeName(name);
  const already = hutRecords.some((item) => normalizeName(item.name) === key);
  if (already) continue;
  const lat = refuge.lat ?? (name === "Rifugio Capanna di Sevice" ? 42.1608 : null);
  const lon = refuge.lon ?? (name === "Rifugio Capanna di Sevice" ? 13.367 : null);
  if (lat === null || lon === null) continue;
  const elevation = refuge.elevation ?? cachedElevation(lat, lon);
  const group = groupOf(lat, lon, elevation);
  hutRecords.push({
    id: `hut-wiki-${slugify(name)}`,
    kind: "hut",
    name,
    lat,
    lon,
    elevation,
    group,
    province: provinceFromCategory(refuge.category),
    description:
      HUT_DESCRIPTIONS[name] ??
      `${name} è un rifugio nel ${group}${elevation ? `, a ${elevation} m` : ""}. Un punto di appoggio per escursioni e traversate in Abruzzo.`,
    imageUrl: refuge.image ?? null,
    imageCredit: refuge.image ? "Wikipedia / Wikimedia Commons" : null,
    sourceUrl: refuge.sourceUrl,
    sourceLabel: "Wikipedia",
    tags: ["Rifugio", group],
    featured: HUT_FEATURED.has(name),
  });
}

const webcamForHut = (name) => {
  const needle = normalizeName(name);
  if (!needle) return null;
  return webcamRecords.find((cam) => {
    const hay = normalizeName(cam.name);
    return hay.includes(needle) || needle.includes(hay);
  });
};

for (const hut of hutRecords) {
  if (!hut.imageUrl) {
    const cam = webcamForHut(hut.name);
    if (cam) {
      hut.imageUrl = cam.imageUrl;
      hut.imageCredit = `Webcam ${cam.imageCredit ?? cam.sourceLabel}`;
    }
  }
}

const byFeature = (a, b) =>
  Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
  (b.elevation ?? 0) - (a.elevation ?? 0) ||
  a.name.localeCompare(b.name, "it");

peakRecords.sort(byFeature);
hutRecords.sort(byFeature);
webcamRecords.sort(byFeature);

const meta = {
  generatedAt: "2026-11-26",
  counts: {
    peaks: peakRecords.length,
    huts: hutRecords.length,
    webcams: webcamRecords.length,
    total: peakRecords.length + hutRecords.length + webcamRecords.length,
  },
  sources: [
    { label: "OpenStreetMap", url: "https://www.openstreetmap.org/copyright", license: "ODbL" },
    { label: "Wikipedia / Wikimedia Commons", url: "https://it.wikipedia.org", license: "CC BY-SA" },
    { label: "Open-Meteo", url: "https://open-meteo.com", license: "CC BY 4.0" },
    {
      label: "Ass. AQ Caput Frigoris — webcam",
      url: "https://www.caputfrigoris.it/webcam_abruzzo.php",
      license: "Immagini dei rispettivi proprietari",
    },
    {
      label: "MeteoProject / CAI Roma — webcam Rifugio Vincenzo Sebastiani",
      url: "https://stazioni.meteoproject.it/dati/rifugiosebastiani/webcam.php",
      license: "Immagine del proprietario",
    },
  ],
};

fs.writeFileSync(path.join(outDir, "mountains.json"), JSON.stringify(peakRecords));
fs.writeFileSync(path.join(outDir, "refuges.json"), JSON.stringify(hutRecords));
fs.writeFileSync(path.join(outDir, "webcams.json"), JSON.stringify(webcamRecords));
fs.writeFileSync(path.join(outDir, "meta.json"), JSON.stringify(meta, null, 2));

console.log(meta.counts);
console.log("featured peaks", peakRecords.filter((item) => item.featured).length);
console.log("featured huts", hutRecords.filter((item) => item.featured).length);
console.log("featured cams", webcamRecords.filter((item) => item.featured).length);
console.log(
  "missing elevation",
  [...peakRecords, ...hutRecords].filter((item) => !item.elevation).length,
);
console.log("webcams approx position", webcamRecords.filter((item) => item.accuracy === "approx").length);
