// Скачивает woff2 (cyrillic + latin) Onest и Shantell Sans из Google Fonts.
import { writeFileSync } from "node:fs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const families = [
  { query: "Onest:wght@700", name: "Onest-Bold" },
  { query: "Shantell+Sans:wght@500", name: "ShantellSans-Medium" },
];
for (const fam of families) {
  const css = await (await fetch("https://fonts.googleapis.com/css2?family=" + fam.query + "&display=swap", { headers: { "User-Agent": UA } })).text();
  const blocks = css.split("/*").filter((b) => b.startsWith(" cyrillic */") || b.startsWith(" latin */"));
  for (const block of blocks) {
    const subset = block.trim().split(" ")[0];
    const url = (block.match(/url\((https:[^)]+\.woff2)\)/) || [])[1];
    if (!url) continue;
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    const file = "src/assets/fonts/" + fam.name + "-" + subset + ".woff2";
    writeFileSync(file, buf);
    console.log(file, buf.length);
  }
}
