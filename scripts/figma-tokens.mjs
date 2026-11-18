// Выводит карты styles и components файла Figma (токены дизайна и библиотека).
import { readFileSync } from "node:fs";

const file = JSON.parse(readFileSync(process.argv[2] || ".figma/file-depth2.json", "utf8"));
console.log("STYLES:");
for (const [id, style] of Object.entries(file.styles || {})) {
  console.log(" ", id, "|", style.styleType, "|", style.name, style.description ? "| " + style.description : "");
}
console.log("\nCOMPONENTS:");
for (const [id, comp] of Object.entries(file.components || {})) {
  console.log(" ", id, "|", comp.name, comp.description ? "| " + comp.description : "");
}
console.log("\nCOMPONENT SETS:");
for (const [id, set] of Object.entries(file.componentSets || {})) {
  console.log(" ", id, "|", set.name, set.description ? "| " + set.description : "");
}
