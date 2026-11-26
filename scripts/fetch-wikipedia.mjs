import fs from "node:fs";
import { execFileSync } from "node:child_process";

const UA = "MountainViewAbruzzo/1.0 (demo hiking portal)";
const API = "https://it.wikipedia.org/w/api.php";
const WIKIDATA = "https://www.wikidata.org/w/api.php";
const sleep = (ms) => execFileSync("sleep", [String(ms / 1000)]);

function curlJson(url, label) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const body = execFileSync(
        "curl",
        ["-sS", "-m", "60", "--compressed", url.toString(), "-H", `User-Agent: ${UA}`],
        { encoding: "utf8", maxBuffer: 30 * 1024 * 1024 },
      );
      if (body.trim().startsWith("{")) return JSON.parse(body);
      const retry = body.match(/retry-after:\s*(\d+)/i)?.[1] ?? "20";
      console.log(`${label}: non-JSON, waiting ${retry}s`);
      sleep(Number(retry) * 1000 + 1000);
    } catch (error) {
      console.log(`${label}: retry ${attempt + 1}`);
      sleep(4000);
    }
  }
  throw new Error(`${label} failed`);
}

function api(params) {
  const url = new URL(API);
  Object.entries({ format: "json", formatversion: "2", ...params }).forEach(([key, value]) =>
    url.searchParams.set(key, value),
  );
  return curlJson(url, "Wikipedia API");
}

const categories = [
  "Categoria:Montagne della provincia dell'Aquila",
  "Categoria:Montagne della provincia di Teramo",
  "Categoria:Montagne della provincia di Pescara",
  "Categoria:Montagne della provincia di Chieti",
  "Categoria:Rifugi dell'Abruzzo",
];

const pages = new Map();
for (const category of categories) {
  let cont = null;
  do {
    const data = api({
      action: "query",
      generator: "categorymembers",
      gcmtitle: category,
      gcmlimit: "500",
      prop: "coordinates|pageprops|pageimages",
      piprop: "thumbnail",
      pithumbsize: "1100",
      ppprop: "wikibase_item",
      ...(cont ?? {}),
    });
    for (const page of data.query?.pages ?? []) {
      if (page.ns !== 0) continue;
      if (!pages.has(page.title)) {
        pages.set(page.title, { ...page, sourceCategory: category });
      }
    }
    cont = data.continue ?? null;
    if (cont) sleep(3000);
  } while (cont);
  console.log(`${category}: ${pages.size} total`);
  sleep(2500);
}

const list = [...pages.values()];
fs.writeFileSync("/tmp/opencode/wiki_pages.json", JSON.stringify(list, null, 2));
const qids = [...new Set(list.map((page) => page.pageprops?.wikibase_item).filter(Boolean))];
const claims = new Map();
for (let i = 0; i < qids.length; i += 50) {
  const batch = qids.slice(i, i + 50);
  const url = new URL(WIKIDATA);
  url.searchParams.set("action", "wbgetentities");
  url.searchParams.set("ids", batch.join("|"));
  url.searchParams.set("props", "claims|labels");
  url.searchParams.set("languages", "it|en");
  url.searchParams.set("format", "json");
  const data = curlJson(url, "Wikidata API");
  for (const [qid, entity] of Object.entries(data.entities ?? {})) {
    claims.set(qid, entity);
  }
  console.log(`Wikidata: ${Math.min(i + 50, qids.length)}/${qids.length}`);
  sleep(3000);
}

const elevationOf = (entity) => {
  const claim = entity?.claims?.P2044?.[0]?.mainsnak?.datavalue?.value;
  if (!claim) return null;
  const amount = Number(claim.amount);
  return Number.isFinite(amount) ? Math.round(amount) : null;
};

const imageOf = (entity) => {
  const fileName = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  if (!fileName) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=1200`;
};

const records = list.map((page) => {
  const entity = page.pageprops?.wikibase_item ? claims.get(page.pageprops.wikibase_item) : null;
  const coord = page.coordinates?.[0];
  return {
    title: page.title,
    qid: page.pageprops?.wikibase_item ?? null,
    lat: coord?.lat ?? null,
    lon: coord?.lon ?? null,
    elevation: elevationOf(entity),
    image: page.thumbnail?.source ?? imageOf(entity),
    sourceUrl: `https://it.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`,
    category: page.sourceCategory,
  };
});

const isRefuge = (record) =>
  /^Rifugio|^Bivacco/i.test(record.title) || /Rifugi/.test(record.category ?? "");
const mountains = records.filter((record) => !isRefuge(record));
const refuges = records.filter(isRefuge);

fs.writeFileSync("/tmp/opencode/wiki_mountains.json", JSON.stringify(mountains, null, 2));
fs.writeFileSync("/tmp/opencode/wiki_refuges.json", JSON.stringify(refuges, null, 2));
console.log(
  `mountains ${mountains.length} (with coords ${mountains.filter((r) => r.lat !== null).length}), refuges ${refuges.length}`,
);
