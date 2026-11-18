// Скачивает все растровые изображения макета из .figma/image-refs.json в .figma/images/<ref>.<ext>.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const refs = JSON.parse(readFileSync(".figma/image-refs.json", "utf8"));
const images = refs.meta?.images || refs.images || {};
const dir = ".figma/images";
mkdirSync(dir, { recursive: true });
let done = 0;
const entries = Object.entries(images);
for (const [ref, url] of entries) {
  try {
    const res = await fetch(url);
    if (!res.ok) { console.log("FAIL", ref, res.status); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = (url.split("?")[0].match(/\.(png|jpe?g|webp|gif)$/i) || [".png"])[0];
    writeFileSync(dir + "/" + ref + ext, buf);
    done++;
    if (done % 10 === 0) console.log("downloaded", done, "/", entries.length);
  } catch (e) {
    console.log("ERR", ref, e.message);
  }
}
console.log("DONE", done, "/", entries.length);
