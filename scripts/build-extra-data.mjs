// Извлекает геометрию «блюд» продукции, чипы витрины и фото галереи из Figma,
// копирует новые raster-ассеты в src/assets/img и дополняет src/data/data.json.
import { readFileSync, writeFileSync, copyFileSync, readdirSync } from "node:fs";

const file = JSON.parse(readFileSync(".figma/file-full.json", "utf8"));
const data = JSON.parse(readFileSync("src/data/data.json", "utf8"));
const images = readdirSync(".figma/images");

function findById(node, id) {
  if (node.id === id) return node;
  for (const child of node.children || []) {
    const found = findById(child, id);
    if (found) return found;
  }
  return null;
}
function walk(node, fn) {
  fn(node);
  for (const child of node.children || []) walk(child, fn);
}
function imageRef(node) {
  const paint = (node.fills || []).find((p) => p.type === "IMAGE");
  return paint ? paint.imageRef : null;
}
function copyImage(ref, name) {
  const src = images.find((f) => f.startsWith(ref));
  if (!src) { console.log("MISSING", ref); return null; }
  copyFileSync(".figma/images/" + src, "src/assets/img/" + name + ".png");
  return name;
}
const pct = (box, base) => ({
  x: +(((box.x - base.x) / base.width) * 100).toFixed(2),
  y: +(((box.y - base.y) / base.height) * 100).toFixed(2),
  w: +((box.width / base.width) * 100).toFixed(2),
  h: +((box.height / base.height) * 100).toFixed(2),
});
const center = (b) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });

const sections = [
  ["1:2894", "meat"], ["1:2862", "spices"], ["1:2928", "fish"],
  ["1:2911", "cheese"], ["1:2878", "tea"], ["1:2945", "sweets"],
];
data.productSections = [];
for (const [id, slug] of sections) {
  const node = findById(file.document, id);
  const base = node.absoluteBoundingBox;
  const entry = { slug, title: "", description: "", photo: "", plate: null, pins: [], labels: [] };
  const pins = [];
  const labels = [];
  walk(node, (n) => {
    if (n.type === "TEXT" && n.name === "section-title") entry.title = n.characters;
    if (n.type === "TEXT" && n.name === "description") entry.description = n.characters;
    if (n.type === "RECTANGLE" && n.name === "product-plate-image") {
      entry.photo = copyImage(imageRef(n), "plate-" + slug);
      entry.plate = pct(n.absoluteBoundingBox, base);
    }
    if (n.type === "INSTANCE" && n.name.startsWith("product-hotspot")) {
      pins.push({ box: n.absoluteBoundingBox, name: n.name });
    }
    if (n.type === "TEXT" && n.name.startsWith("product-label")) {
      labels.push({ box: n.absoluteBoundingBox, text: n.characters });
    }
  });
  // Каждое название связываем с ближайшим пином на блюде.
  for (const label of labels) {
    const lc = center(label.box);
    let best = null;
    let bestDist = Infinity;
    for (const pin of pins) {
      const pc = center(pin.box);
      const dist = (pc.x - lc.x) ** 2 + (pc.y - lc.y) ** 2;
      if (dist < bestDist) { bestDist = dist; best = pin; }
    }
    const pos = pct(label.box, base);
    pos.align = lc.x < base.x + base.width / 2 ? "left" : "right";
    pos.text = label.text;
    pos.pin = best ? pins.indexOf(best) : -1;
    entry.labels.push(pos);
    if (best) best.label = label.text;
  }
  entry.pins = pins.map((p) => {
    const pos = pct(p.box, base);
    pos.label = p.label || "";
    return pos;
  });
  data.productSections.push(entry);
}

// Витрина: фото и кликабельные чипы категорий.
const showcase = findById(file.document, "1:2977");
const sbase = showcase.absoluteBoundingBox;
const chipTargets = { "Дары Камчатки": "fish", "Мясные деликатесы": "meat", "Сыры": "cheese" };
data.showcase = { photo: "", chips: [] };
walk(showcase, (n) => {
  if (n.type === "RECTANGLE" && n.name === "product-showcase-image") {
    data.showcase.photo = copyImage(imageRef(n), "showcase-family");
  }
  if (n.type === "INSTANCE" && n.name === "discount-button") {
    const text = (n.children || []).map((c) => c.characters || "").join("");
    const pos = pct(n.absoluteBoundingBox, sbase);
    pos.text = text.replace(" ↗", "");
    pos.target = chipTargets[pos.text] || "";
    data.showcase.chips.push(pos);
  }
});

// Галерея: фото карусели и стикер.
const gallery = findById(file.document, "1:3559");
data.gallery = { photos: [], sticker: "" };
let i = 0;
walk(gallery, (n) => {
  if (n.type === "RECTANGLE" && n.name === "gallery-photo") {
    const name = copyImage(imageRef(n), "gallery-" + (++i));
    if (name) data.gallery.photos.push(name);
  }
  if (n.type === "RECTANGLE" && n.name === "local-manufacturers-sticker") {
    data.gallery.sticker = copyImage(imageRef(n), "sticker-local-manufacturers");
  }
});

writeFileSync("src/data/data.json", JSON.stringify(data, null, 2) + "\n");
console.log("extra data merged:", data.productSections.length, "platters,", data.gallery.photos.length, "gallery photos");
