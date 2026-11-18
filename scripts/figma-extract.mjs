// Извлечение дизайн-токенов и текстов из полного дерева Figma.
// Режимы:
//   node scripts/figma-extract.mjs tokens            — шрифты, цвета, скругления, тени
//   node scripts/figma-extract.mjs text <frameId>    — тексты поддерева с id и стилями
import { readFileSync } from "node:fs";

const file = JSON.parse(readFileSync(".figma/file-full.json", "utf8"));
const mode = process.argv[2] || "tokens";

function hex(color) {
  const to = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
  return "#" + to(color.r) + to(color.g) + to(color.b) + (color.a !== undefined && color.a < 1 ? to(color.a) : "");
}
function walk(node, fn) {
  fn(node);
  for (const child of node.children || []) walk(child, fn);
}
function findById(node, id) {
  if (node.id === id) return node;
  for (const child of node.children || []) {
    const found = findById(child, id);
    if (found) return found;
  }
  return null;
}

if (mode === "tokens") {
  const fonts = new Map();
  const colors = new Map();
  const radii = new Map();
  const effects = new Map();
  walk(file.document, (n) => {
    if (n.type === "TEXT") {
      const s = n.style || {};
      const lh = s.lineHeightPx ? Math.round(s.lineHeightPx * 10) / 10 : "?";
      const ls = s.letterSpacing ? Math.round(s.letterSpacing * 100) / 100 : 0;
      const key = [s.fontFamily, s.fontWeight, s.fontSize, lh, ls, s.textCase || "", s.textDecoration || ""].join(" | ");
      fonts.set(key, (fonts.get(key) || 0) + 1);
    }
    for (const paint of [...(n.fills || []), ...(n.strokes || [])]) {
      if (paint.type === "SOLID" && paint.visible !== false) {
        const key = hex(paint.color) + (paint.opacity !== undefined && paint.opacity < 1 ? " op:" + paint.opacity : "");
        colors.set(key, (colors.get(key) || 0) + 1);
      }
      if (paint.type === "IMAGE") {
        colors.set("IMAGE:" + paint.imageRef, (colors.get("IMAGE:" + paint.imageRef) || 0) + 1);
      }
    }
    if (n.cornerRadius !== undefined) radii.set(String(n.cornerRadius), (radii.get(String(n.cornerRadius)) || 0) + 1);
    if (n.rectangleCornerRadii) radii.set(n.rectangleCornerRadii.join(","), (radii.get(n.rectangleCornerRadii.join(",")) || 0) + 1);
    for (const e of n.effects || []) {
      if (e.visible === false) continue;
      const key = [e.type, e.color ? hex(e.color) : "", e.offset ? e.offset.x + "," + e.offset.y : "", e.radius, e.spread || ""].join(" | ");
      effects.set(key, (effects.get(key) || 0) + 1);
    }
  });
  const sorted = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]);
  console.log("FONTS (family | weight | size | lineHeight | letterSpacing | case | decoration — count):");
  for (const [k, c] of sorted(fonts)) console.log(" ", k, "—", c);
  console.log("\nCOLORS:");
  for (const [k, c] of sorted(colors)) console.log(" ", k, "—", c);
  console.log("\nRADII:");
  for (const [k, c] of sorted(radii)) console.log(" ", k, "—", c);
  console.log("\nEFFECTS:");
  for (const [k, c] of sorted(effects)) console.log(" ", k, "—", c);
}

if (mode === "text") {
  const root = findById(file.document, process.argv[3]);
  if (!root) { console.error("frame not found"); process.exit(1); }
  walk(root, (n) => {
    if (n.type === "TEXT") {
      const s = n.style || {};
      const fill = (n.fills || []).find((p) => p.type === "SOLID");
      console.log("[" + n.id + "] " + JSON.stringify(n.characters) + " | " + s.fontFamily + " " + s.fontWeight + " " + s.fontSize + "/" + (s.lineHeightPx || "?") + (fill ? " " + hex(fill.color) : ""));
    }
  });
}
