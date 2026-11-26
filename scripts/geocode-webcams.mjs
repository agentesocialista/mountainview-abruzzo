import fs from "node:fs";
import path from "node:path";

const raw = JSON.parse(fs.readFileSync("/tmp/opencode/webcams_raw.json", "utf8"));
const cachePath = "/tmp/opencode/webcam-geocode-cache.json";
const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, "utf8")) : {};
const provinceCenters = {
  "Provincia de L'Aquila": [42.35, 13.4],
  "Provincia di Teramo": [42.66, 13.7],
  "Provincia di Pescara": [42.46, 13.98],
  "Provincia di Chieti": [42.35, 14.17],
  "Webcam Appennino": [42.1, 13.3],
};

const clean = (value) =>
  value
    .replace(/\[[^\]]*\]/g, "")
    .replace(/^Rifugio\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

const unique = [...new Set(raw.map((item) => clean(item.label)))];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function geocode(query) {
  const params = new URLSearchParams({
    q: `${query}, Abruzzo, Italia`,
    format: "jsonv2",
    limit: "1",
    countrycodes: "it",
    viewbox: "12.9,42.95,14.65,41.6",
    bounded: "1",
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { "User-Agent": "MountainViewAbruzzo/1.0 (demo hiking portal)" },
  });
  if (!response.ok) {
    if (response.status === 429) {
      console.log("rate limited, waiting 8s");
      await sleep(8000);
      return geocode(query);
    }
    throw new Error(`Nominatim ${response.status}`);
  }
  const data = await response.json();
  if (!data[0]) return null;
  return {
    lat: Number(data[0].lat),
    lon: Number(data[0].lon),
    displayName: data[0].display_name,
    accuracy: "geocoded",
  };
}

let index = 0;
for (const name of unique) {
  index += 1;
  if (cache[name]) {
    console.log(`${index}/${unique.length} cached: ${name}`);
    continue;
  }
  try {
    let hit = await geocode(name);
    if (!hit) {
      await sleep(1100);
      hit = await geocode(`${name} Abruzzo`);
    }
    cache[name] = hit ?? null;
    console.log(`${index}/${unique.length} ${hit ? "ok" : "miss"}: ${name}`);
  } catch (error) {
    console.error(`${index}/${unique.length} error: ${name}`, error.message);
    cache[name] = null;
  }
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  await sleep(1100);
}

const geocoded = raw.map((item) => {
  const hit = cache[clean(item.label)];
  const fallback = provinceCenters[item.province] ?? [42.35, 13.4];
  return {
    ...item,
    lat: hit?.lat ?? fallback[0],
    lon: hit?.lon ?? fallback[1],
    geocoded: Boolean(hit),
    displayName: hit?.displayName ?? null,
  };
});

fs.writeFileSync("/tmp/opencode/webcams_geocoded.json", JSON.stringify(geocoded, null, 2));
console.log(
  `done: ${geocoded.filter((item) => item.geocoded).length}/${geocoded.length} geocoded`,
);
