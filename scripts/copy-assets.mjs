// Копирует ассеты макета в src/assets/img с семантическими именами.
// Фото: .figma/images/<ref>.* по префиксу; SVG: .figma/svg/<id>.svg.
import { copyFileSync, readdirSync } from "node:fs";

const photos = {
  "ad11d9fe": "hero-1", "49df2954": "hero-2", "a0bc3cdc": "hero-3", "5b4451c8": "hero-4",
  "cd612a29": "hero-5", "15b63ad3": "hero-6", "cb615873": "hero-7", "f3082658": "hero-8",
  "4763b7da": "hero-9", "5c6b73d5": "hero-10", "61266a5a": "hero-11", "1fa6aeb9": "hero-12",
  "8a1ced45": "hero-13",
  "2f4709c3": "fair-moscow", "08b52071": "fair-tver", "d4750685": "fair-tula",
  "fcb904a8": "category-meat", "27725073": "category-spices", "3ea8d602": "category-fish",
  "7742d80d": "category-cheese", "6c530ce2": "category-tea", "d7799a09": "category-sweets",
  "86549fd2": "product-ikra-photo", "c6dc20db": "product-cheese-photo", "04dd9ae4": "product-kazy-photo",
  "daf21598": "product-ikra-cutout", "ca6d6b47": "product-cheese-cutout", "6e5db4f2": "product-kazy-cutout",
  "efd60cb5": "producer-1", "9f3c8ed6": "producer-2", "4a955e6f": "producer-3", "4c774cb3": "producer-4",
  "6e87a480": "video-1", "b6c72317": "video-2", "3f3577f3": "video-3", "b70beeff": "video-4",
  "2bd6b983": "video-5", "a70ea1c9": "video-6", "6a0c0086": "video-7", "702ce7e8": "video-8",
  "82d024bc": "video-9",
  "0b82e622": "discount-photo",
};
const svgs = {
  "I1-4232-25-451": "logo-header",
  "I1-4236-157-9615": "logo-footer",
  "I1-4232-25-445-23-259": "chevron-down",
  "1-4230": "sticker-100",
  "1-4231": "sticker-tasting",
  "1-4233": "stamp-natural",
  "1-4212": "hero-pattern",
  "1-4157": "page-pattern",
  "I1-4236-2029-4928": "social-whatsapp",
  "I1-4236-2029-4936": "social-vk",
  "I1-4236-2202-8778": "social-telegram",
  "1-4207": "stamp-manufacturers",
  "1-4199": "stamp-regional-tastes",
  "1-4200": "stamp-straight-from-farmers",
  "1-4172": "stamp-choose-yours",
  "1-4173": "stamp-traditions",
  "I1-4175-72-5900": "sticker-producers-lime",
  "I1-4175-72-5901": "sticker-producers-red",
  "1-4177": "promo-pattern",
  "1-4183": "sticker-discount-10",
  "1-4184": "sticker-promocode",
  "1-4162": "coverage-map",
  "I1-4193-70-4492-66-3916-21-125": "arrow-left",
  "I1-4193-70-4492-66-3917-21-161": "arrow-right",
  "I1-4235-144-4680": "stamp-discount",
  "I1-4193-70-4492-68-4214-68-4204": "product-ikra-outline",
  "I1-4193-70-4493-70-4322-70-4627": "product-cheese-outline",
  "I1-4193-70-4494-70-4359-70-4632": "product-kazy-outline",
  "I1-3965-131-2292-101-8520": "burger",
};

const files = readdirSync(".figma/images");
for (const [ref, name] of Object.entries(photos)) {
  const file = files.find((f) => f.startsWith(ref));
  if (!file) { console.log("MISSING photo", ref); continue; }
  const ext = file.slice(file.lastIndexOf("."));
  copyFileSync(".figma/images/" + file, "src/assets/img/" + name + ext);
}
for (const [id, name] of Object.entries(svgs)) {
  copyFileSync(".figma/svg/" + id + ".svg", "src/assets/img/" + name + ".svg");
}
console.log("assets copied");
