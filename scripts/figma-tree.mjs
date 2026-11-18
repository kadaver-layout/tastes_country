// Дамп поддерева узла Figma: id, тип, имя, размер, заливка, скругление, поворот.
// Использование: node scripts/figma-tree.mjs <nodeId> [depth] [outfile]
import { readFileSync, writeFileSync } from "node:fs";

const file = JSON.parse(readFileSync(".figma/file-full.json", "utf8"));
const id = process.argv[2];
const maxDepth = parseInt(process.argv[3] || "4", 10);
const out = process.argv[4];

function hex(color) {
  const to = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
  return "#" + to(color.r) + to(color.g) + to(color.b);
}
function findById(node, id) {
  if (node.id === id) return node;
  for (const child of node.children || []) {
    const found = findById(child, id);
    if (found) return found;
  }
  return null;
}
function paintInfo(n) {
  const parts = [];
  for (const p of n.fills || []) {
    if (p.visible === false) continue;
    if (p.type === "SOLID") parts.push(hex(p.color) + (p.opacity < 1 ? "@" + p.opacity : ""));
    else if (p.type === "IMAGE") parts.push("img:" + p.imageRef.slice(0, 8) + ":" + p.scaleMode);
    else parts.push(p.type);
  }
  return parts.join(",");
}
const lines = [];
function dump(n, depth) {
  if (depth > maxDepth) return;
  const box = n.absoluteBoundingBox;
  const size = box ? Math.round(box.width) + "x" + Math.round(box.height) : "";
  const fills = paintInfo(n);
  const extra = [
    fills ? "fill=" + fills : "",
    n.cornerRadius ? "r=" + n.cornerRadius : "",
    n.rotation ? "rot=" + Math.round(n.rotation * 10) / 10 : "",
    n.opacity !== undefined && n.opacity < 1 ? "op=" + n.opacity : "",
    n.type === "TEXT" ? "text=" + JSON.stringify((n.characters || "").slice(0, 40)) : "",
  ].filter(Boolean).join(" ");
  lines.push("  ".repeat(depth) + n.type + " | " + n.name + " | " + n.id + " | " + size + (extra ? " | " + extra : ""));
  for (const child of n.children || []) dump(child, depth + 1);
}
const root = findById(file.document, id);
if (!root) { console.error("not found"); process.exit(1); }
dump(root, 0);
const text = lines.join("\n");
if (out) writeFileSync(out, text);
else console.log(text);
