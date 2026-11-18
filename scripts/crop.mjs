// Вырезает вертикальный фрагмент PNG: node scripts/crop.mjs <in> <out> <top> <height> [width]
import sharp from "sharp";

const [inp, out, top, height, width] = process.argv.slice(2);
const meta = await sharp(inp).metadata();
await sharp(inp)
  .extract({ left: 0, top: parseInt(top, 10), width: width ? parseInt(width, 10) : meta.width, height: parseInt(height, 10) })
  .toFile(out);
console.log("cropped", out);
