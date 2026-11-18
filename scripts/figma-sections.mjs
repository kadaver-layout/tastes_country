// Краткий состав секций страниц из ответа /nodes (depth=2).
import { readFileSync } from "node:fs";

const data = JSON.parse(readFileSync(process.argv[2] || ".figma/sections-depth2.json", "utf8"));
for (const [id, node] of Object.entries(data.nodes)) {
  const doc = node.document;
  console.log("\nFRAME:", doc.name, "(" + id + ")");
  const children = [...(doc.children || [])].sort((a, b) => (a.absoluteBoundingBox?.y || 0) - (b.absoluteBoundingBox?.y || 0));
  for (const child of children) {
    const box = child.absoluteBoundingBox;
    const size = box ? Math.round(box.width) + "x" + Math.round(box.height) : "?";
    console.log("  -", child.type, "|", child.name, "| id:", child.id, "|", size);
  }
}
