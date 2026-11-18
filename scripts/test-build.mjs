// Диагностика: компиляция main.sass и конвертация одного PNG в WebP вне gulp.
import * as sass from "sass";
import sharp from "sharp";

try {
  const result = sass.compile("src/assets/styles/main.sass");
  console.log("SASS OK, css bytes:", result.css.length);
} catch (e) {
  console.log("SASS ERROR:", e.message);
}
try {
  await sharp("src/assets/img/hero-1.png").webp({ quality: 80 }).toFile("dist/assets/img/hero-1.webp");
  console.log("WEBP OK");
} catch (e) {
  console.log("WEBP ERROR:", e.message);
}
