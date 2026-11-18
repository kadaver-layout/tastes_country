// Экспорт PNG-скриншотов узлов Figma в .figma/shots/<id>.png.
// Использование: node scripts/figma-shots.mjs "1:2,1:3,..." [scale]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const FILE_KEY = "rwR6Lnn3nbubN02pxBrrVF";
const token = readFileSync(".figma-token", "utf8").trim();
const ids = process.argv[2];
const scale = process.argv[3] || "1";
if (!ids) {
  console.error("Usage: node scripts/figma-shots.mjs <ids> [scale]");
  process.exit(1);
}
const dir = ".figma/shots";
mkdirSync(dir, { recursive: true });

const res = await fetch(
  "https://api.figma.com/v1/images/" + FILE_KEY + "?ids=" + ids + "&format=png&scale=" + scale,
  { headers: { "X-Figma-Token": token } }
);
const json = await res.json();
if (!res.ok || json.err) {
  console.error("Figma API error:", res.status, JSON.stringify(json).slice(0, 300));
  process.exit(1);
}
for (const [id, url] of Object.entries(json.images || {})) {
  if (!url) { console.log("NO IMAGE for", id); continue; }
  const img = await fetch(url);
  const buf = Buffer.from(await img.arrayBuffer());
  const name = id.replace(/:/g, "-") + ".png";
  writeFileSync(dir + "/" + name, buf);
  console.log(name, buf.length, "bytes");
}
