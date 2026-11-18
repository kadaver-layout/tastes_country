// Список цветов и число путей в SVG карты.
import { readFileSync } from "node:fs";
const s = readFileSync("src/assets/img/coverage-map.svg", "utf8");
const fills = [...s.matchAll(/fill="([^"]+)"/g)].map((x) => x[1]);
console.log([...new Set(fills)].join(", "));
console.log("paths:", (s.match(/<path/g) || []).length);
