import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const raw = (name) => JSON.parse(fs.readFileSync(path.join(root, "scripts/raw", name), "utf8"));
const huts = raw("huts.json");
const webcams = raw("webcams_geocoded.json");

const coordinates = new Map();
const add = (lat, lon) => {
  if (typeof lat !== "number" || typeof lon !== "number") return;
  const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
  if (!coordinates.has(key)) coordinates.set(key, { lat, lon });
};
for (const element of huts.elements) add(element.lat ?? element.center?.lat, element.lon ?? element.center?.lon);
for (const webcam of webcams) add(webcam.lat, webcam.lon);

const items = [...coordinates.entries()];
console.log(`Fetching elevation for ${items.length} coordinates`);
const cache = {};
for (let i = 0; i < items.length; i += 50) {
  const batch = items.slice(i, i + 50);
  const url = new URL("https://api.open-meteo.com/v1/elevation");
  url.searchParams.set("latitude", batch.map(([, value]) => value.lat.toFixed(5)).join(","));
  url.searchParams.set("longitude", batch.map(([, value]) => value.lon.toFixed(5)).join(","));
  const body = execFileSync("curl", ["-sS", "-m", "30", url.toString()], { encoding: "utf8" });
  const data = JSON.parse(body);
  batch.forEach(([key], index) => {
    cache[key] = Math.round(data.elevation[index]);
  });
  console.log(`${Math.min(i + 50, items.length)}/${items.length}`);
  execFileSync("sleep", ["0.4"]);
}

fs.writeFileSync(path.join(root, "scripts/raw/elevations.json"), JSON.stringify(cache, null, 2));
console.log(`Saved ${Object.keys(cache).length} elevations`);
