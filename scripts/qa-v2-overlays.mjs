// Создаёт полупрозрачные наложения локальных снимков Figma и браузера.
// Сначала: QA_SCREENSHOTS=1 npm run qa:v2 (PowerShell: $env:QA_SCREENSHOTS='1').
import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
const frames = {
  index: {375:'1-3875',768:'1-3969',1280:'1-4063',1920:'1-4156'},
  products: {375:'1-2425',768:'1-2548',1280:'1-2679',1920:'1-2833'},
  schedule: {375:'1-3704',768:'1-3745',1280:'1-3832',1920:'1-3790'},
  contacts: {375:'1-3370',768:'1-3240',1280:'1-3108',1920:'1-2988'},
  thanks: {375:'1-3445',768:'1-3318',1280:'1-3186',1920:'1-3062'},
  about: {375:'1-3495',768:'1-3651',1280:'1-3597',1920:'1-3545'},
  '404': {375:'1-3470',768:'1-3344',1280:'1-3213',1920:'1-3085'}
};
const dir='.figma/build-shots/qa2-overlays'; await mkdir(dir,{recursive:true});
for(const [page,widths] of Object.entries(frames)) for(const [width,id] of Object.entries(widths)) {
  const reference=`.figma/shots/${id}.png`, current=`.figma/build-shots/qa2-final/${page}-${width}.png`;
  const a=await sharp(reference).metadata(), b=await sharp(current).metadata();
  const height=Math.max(a.height,b.height);
  const top=await sharp(current).ensureAlpha(0.5).png().toBuffer();
  await sharp({create:{width:Number(width),height,channels:4,background:'#fff'}})
    .composite([{input:reference,top:0,left:0},{input:top,top:0,left:0}]).png().toFile(`${dir}/${page}-${width}.png`);
  console.log(`${page} ${width}: Figma ${a.height}, сборка ${b.height}, Δ ${b.height-a.height}`);
}
