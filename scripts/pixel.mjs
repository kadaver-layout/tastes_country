// Цвет пикселя PNG: node scripts/pixel.mjs <file> <x> <y> [x y ...]
import sharp from "sharp";

const [file, ...coords] = process.argv.slice(2);
for (let i = 0; i < coords.length; i += 2) {
  const x = parseInt(coords[i], 10);
  const y = parseInt(coords[i + 1], 10);
  const buf = await sharp(file).extract({ left: x, top: y, width: 1, height: 1 }).raw().toBuffer();
  console.log(x + "," + y, "#" + [...buf.slice(0, 3)].map((v) => v.toString(16).padStart(2, "0")).join(""));
}
