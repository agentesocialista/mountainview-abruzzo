import fs from "node:fs";
import { execFileSync } from "node:child_process";

const UA = "MountainViewAbruzzo/1.0 (demo hiking portal)";
const sleep = (ms) => execFileSync("sleep", [String(ms / 1000)]);

function curlJson(url, label) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const body = execFileSync(
        "curl",
        ["-sS", "-m", "60", "--compressed", url.toString(), "-H", `User-Agent: ${UA}`],
        { encoding: "utf8", maxBuffer: 40 * 1024 * 1024 },
      );
      if (body.trim().startsWith("{")) return JSON.parse(body);
      const retry = body.match(/retry-after:\s*(\d+)/i)?.[1] ?? "20";
      console.log(`${label}: waiting ${retry}s`);
      sleep(Number(retry) * 1000 + 1000);
    } catch (error) {
      console.log(`${label}: retry ${attempt + 1}`);
      sleep(4000);
    }
  }
  throw new Error(`${label} failed`);
}

const mountains = JSON.parse(fs.readFileSync("/tmp/opencode/wiki_mountains.json", "utf8"));
const refuges = JSON.parse(fs.readFileSync("/tmp/opencode/wiki_refuges.json", "utf8"));
const qids = [
  ...new Set([...mountains, ...refuges].map((item) => item.qid).filter(Boolean)),
];
console.log(`Fetching ${qids.length} Wikidata entities`);

const claims = {};
for (let i = 0; i < qids.length; i += 50) {
  const batch = qids.slice(i, i + 50);
  const url = new URL("https://www.wikidata.org/w/api.php");
  url.searchParams.set("action", "wbgetentities");
  url.searchParams.set("ids", batch.join("|"));
  url.searchParams.set("props", "claims|labels");
  url.searchParams.set("languages", "it|en");
  url.searchParams.set("format", "json");
  const data = curlJson(url, "Wikidata API");
  Object.assign(claims, data.entities ?? {});
  console.log(`Wikidata: ${Math.min(i + 50, qids.length)}/${qids.length}`);
  sleep(2500);
}

fs.writeFileSync("/tmp/opencode/wikidata_claims.json", JSON.stringify(claims, null, 2));
console.log(`Saved ${Object.keys(claims).length} entities`);
