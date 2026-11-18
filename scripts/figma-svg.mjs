// Экспорт SVG-ассетов узлов Figma в .figma/svg/<id>.svg.
// Использование: node scripts/figma-svg.mjs "1:2,1:3,..."
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const FILE_KEY = "rwR6Lnn3nbubN02pxBrrVF";
const token = readFileSync(".figma-token", "utf8").trim();
const ids = process.argv[2];
if (!ids) { console.error("Usage: node scripts/figma-svg.mjs <ids>"); process.exit(1); }
const dir = ".figma/svg";
mkdirSync(dir, { recursive: true });

const res = await fetch(
  "https://api.figma.com/v1/images/" + FILE_KEY + "?ids=" + ids + "&format=svg",
  { headers: { "X-Figma-Token": token } }
);
const json = await res.json();
if (!res.ok || json.err) {
  console.error("Figma API error:", res.status, JSON.stringify(json).slice(0, 300));
  process.exit(1);
}
for (const [id, url] of Object.entries(json.images || {})) {
  if (!url) { console.log("NO SVG for", id); continue; }
  const svg = await fetch(url);
  const text = await svg.text();
  const name = id.replace(/[:;]/g, "-") + ".svg";
  writeFileSync(dir + "/" + name, text);
  console.log(name, text.length, "bytes");
}
