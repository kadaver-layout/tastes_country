// Запросы к Figma REST API. Токен читается из .figma-token (не попадает в git).
// Использование: node scripts/figma-api.mjs <endpoint> <output.json>
// Пример: node scripts/figma-api.mjs "files/KEY?depth=2" .figma/file.json
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const token = readFileSync(".figma-token", "utf8").trim();
const [endpoint, out] = process.argv.slice(2);
if (!endpoint || !out) {
  console.error("Usage: node scripts/figma-api.mjs <endpoint> <output.json>");
  process.exit(1);
}

const response = await fetch("https://api.figma.com/v1/" + endpoint, {
  headers: { "X-Figma-Token": token },
});
const text = await response.text();
if (!response.ok) {
  console.error("Figma API error:", response.status, text.slice(0, 500));
  process.exit(1);
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, text);
console.log("Saved", out, "(" + text.length + " bytes)");
