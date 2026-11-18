// Скачивает архив шрифта Multiround Pro (SIL OFL) с Google Drive автора.
import { writeFileSync } from "node:fs";

const id = "1V7VNlMwRTtTpLGU3woS9rpBdfy1VtRDJ";
let res = await fetch("https://drive.google.com/uc?export=download&id=" + id, { redirect: "follow" });
let type = res.headers.get("content-type") || "";
if (type.includes("text/html")) {
  const html = await res.text();
  const match = html.match(/href="(https:\/\/drive\.google\.com\/[^"]*confirm[^"]*)"/) || html.match(/action="([^"]+)"/);
  if (!match) { console.error("no download link in HTML", html.slice(0, 300)); process.exit(1); }
  const url = match[1].replace(/&amp;/g, "&");
  res = await fetch(url, { redirect: "follow" });
  type = res.headers.get("content-type") || "";
}
const buf = Buffer.from(await res.arrayBuffer());
writeFileSync(".figma/multiround.zip", buf);
console.log("saved .figma/multiround.zip", buf.length, "bytes, type:", type);
