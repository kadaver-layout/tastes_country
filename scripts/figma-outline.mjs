// Краткий план файла Figma: страницы и фреймы верхнего уровня с id и размерами.
import { readFileSync } from "node:fs";

const file = JSON.parse(readFileSync(process.argv[2] || ".figma/file-depth2.json", "utf8"));
console.log("FILE:", file.name, "| lastModified:", file.lastModified);
for (const page of file.document.children) {
  console.log("\nPAGE:", page.name, "(" + page.id + ")");
  for (const frame of page.children || []) {
    const box = frame.absoluteBoundingBox;
    const size = box ? Math.round(box.width) + "x" + Math.round(box.height) : "?";
    console.log("  -", frame.type, "|", frame.name, "| id:", frame.id, "|", size);
  }
}
