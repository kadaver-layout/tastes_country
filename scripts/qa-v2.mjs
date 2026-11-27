import puppeteer from 'puppeteer-core';
import { createServer } from 'node:http';
import { readFile, access, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';

const candidates = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/chromium', '/usr/bin/google-chrome'].filter(Boolean);
let executablePath;
for (const candidate of candidates) { try { await access(candidate); executablePath = candidate; break; } catch {} }
if (!executablePath) throw new Error('Укажите путь к Chrome или Chromium в CHROME_PATH');
const root = resolve('dist');
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!path.startsWith(root + '/') && !path.startsWith(root + '\\')) throw new Error('invalid path');
    const content = await readFile(path);
    res.setHeader('Content-Type', ({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.mp4':'video/mp4'})[extname(path)] || 'application/octet-stream');
    res.end(content);
  } catch { res.statusCode = 404; res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({executablePath, headless: true, args: ['--no-sandbox']});
const pages = ['index','products','schedule','contacts','thanks','about','404'];
const widths = [360,375,480,600,768,1024,1280,1440,1600,1680,1919,1920];
const failures = [];
try {
  for (const name of pages) for (const width of widths) {
    const page = await browser.newPage();
    await page.setViewport({width,height:1000});
    const errors=[];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(`${base}/${name}.html`, {waitUntil:'load'});
    await page.evaluate(() => document.fonts.ready);
    const state=await page.evaluate(() => {
      const hero=document.querySelector('.page-hero'), box=hero?.getBoundingClientRect();
      const clipped=hero ? [...hero.querySelectorAll('.page-hero__title,.page-hero__lead,.page-hero__actions')].filter(e=>{const r=e.getBoundingClientRect();return getComputedStyle(e).display!=='none'&&(r.bottom>box.bottom+2||r.right>box.right+2)}).map(e=>e.className) : [];
      return {scrollWidth:document.documentElement.scrollWidth, height:document.documentElement.scrollHeight, broken:[...document.images].filter(x=>x.currentSrc && !x.complete || x.currentSrc && !x.naturalWidth).map(x=>x.currentSrc),clipped};
    });
    if (state.scrollWidth !== width || state.broken.length || state.clipped.length || errors.length) failures.push({name,width,...state,errors});
    if (process.env.QA_SCREENSHOTS && [375,768,1280,1920].includes(width)) {
      await mkdir('.figma/build-shots/qa2-final',{recursive:true});
      await page.screenshot({path:`.figma/build-shots/qa2-final/${name}-${width}.png`,fullPage:true});
    }
    await page.close();
  }
  const page=await browser.newPage(); await page.setViewport({width:1280,height:900});
  await page.goto(`${base}/index.html`,{waitUntil:'load'});
  for (const width of [1920,1680,1280,768,375]) {
    await page.setViewport({width,height:900});
    for (const fraction of [0.1,0.5,0.9]) {
      await page.evaluate(()=>document.querySelector('.featured__card').scrollIntoView({block:'center'}));
      const point=await page.$eval('.featured__card',(e,f)=>{const r=e.getBoundingClientRect();return {x:r.left+r.width*f,y:Math.max(30,Math.min(innerHeight-30,r.top+r.height/2))}},fraction);
      await page.mouse.move(point.x,point.y);
      const start=await page.evaluate(()=>({y:scrollY,transform:document.querySelector('.featured__list').style.transform}));
      await page.mouse.wheel({deltaY:300});await new Promise(r=>setTimeout(r,120));
      const end=await page.evaluate(()=>({y:scrollY,transform:document.querySelector('.featured__list').style.transform}));
      assert(end.y>start.y && end.transform===start.transform,`wheel at ${width}px / ${fraction}`);
    }
  }
  await page.setViewport({width:1280,height:900});
  await page.evaluate(() => document.querySelector('.featured').scrollIntoView({block:'center'}));
  const box=await page.$eval('.featured__card',e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}});
  await page.mouse.move(box.x,box.y);
  const before=await page.evaluate(()=>({y:scrollY,transform:document.querySelector('.featured__list').style.transform}));
  await page.mouse.wheel({deltaY:450}); await new Promise(r=>setTimeout(r,250));
  const after=await page.evaluate(()=>({y:scrollY,transform:document.querySelector('.featured__list').style.transform}));
  assert(after.y > before.y && after.transform===before.transform,'vertical wheel');
  await page.mouse.wheel({deltaX:600}); await new Promise(r=>setTimeout(r,250));
  assert.equal(await page.$eval('.featured__list',e=>e.style.transform),after.transform,'horizontal wheel');
  const refresh=await page.evaluate(()=>{for(let i=0;i<10;i++) window.TastesRails.refresh();return document.querySelectorAll('.featured [data-rail-clone]').length}); assert.equal(refresh,2);
  await page.$eval('.featured [data-rail-next]',e=>e.click());await new Promise(r=>setTimeout(r,400));
  assert.equal(await page.$eval('.featured__list',e=>Math.round(-new DOMMatrix(getComputedStyle(e).transform).m41/e.parentElement.clientWidth)),2);
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await page.reload({waitUntil:'load'});
  const reduced=await page.evaluate(()=>{let r=document.querySelector('.featured__card'),t=r.querySelector('[data-rail-track]'),next=r.querySelector('[data-rail-next]');let order=[];for(let i=0;i<3;i++){next.click();order.push(Math.round(-new DOMMatrix(getComputedStyle(t).transform).m41/r.clientWidth))}return order});assert.deepEqual(reduced,[2,3,1]);
  const producer=await page.evaluate(()=>{const rail=document.querySelector('.producers__card'),track=rail.querySelector('[data-rail-track]');rail.querySelector('[data-rail-next]').click();return {offset:-new DOMMatrix(getComputedStyle(track).transform).m41,width:track.parentElement.clientWidth}});
  assert.equal(producer.offset,producer.width*2,'producer photo advances by its viewport width');
  const counts=await page.evaluate(()=>{const rail=document.querySelector('.featured__card'),track=rail.querySelector('[data-rail-track]'),button=rail.querySelector('[data-rail-next]');const originals=[...track.children].filter(x=>!x.hasAttribute('data-rail-clone')).map(x=>x.cloneNode(true));return [0,1,2,3,4].map(n=>{window.TastesRails.destroy(rail);track.replaceChildren(...Array.from({length:n},(_,i)=>originals[i%originals.length].cloneNode(true)));window.TastesRails.init(rail);return [track.querySelectorAll('[data-rail-clone]').length,button.disabled]})});
  assert.deepEqual(counts,[[0,true],[0,true],[2,false],[2,false],[2,false]],'0–4 slides and scoped initialization');
  await page.setViewport({width:375,height:900});
  await page.goto(`${base}/products.html`,{waitUntil:'load'});
  assert(await page.$eval('.page-hero',e=>e.querySelector('.page-hero__lead').getBoundingClientRect().bottom <= e.getBoundingClientRect().bottom+1),'product hero description is not clipped');
  await page.setViewport({width:1280,height:900});
  await page.goto(`${base}/schedule.html`,{waitUntil:'load'});
  assert.equal(await page.$eval('[data-week-prev]',e=>e.disabled),true);
  const initialWeek=await page.$eval('[data-week-label]',e=>e.textContent);
  await page.evaluate(()=>{window.TastesIntegrations={...window.TastesIntegrations,loadWeek:()=>Promise.reject(new Error('test'))}});
  await page.$eval('[data-week-next]',e=>e.click());
  await page.waitForFunction(()=>document.querySelector('[data-week-status]').textContent.includes('Не удалось'));
  assert.equal(await page.$eval('[data-week-label]',e=>e.textContent),initialWeek,'failed request preserves the week');
  await page.evaluate(()=>{window.TastesIntegrations.loadWeek=()=>Promise.resolve({start:'2026-12-28',today:null,rows:[{city:'<b>Тест</b>',address:'Без HTML',start:'2026-12-25',end:'2027-01-05'}]})});
  await page.$eval('[data-week-next]',e=>e.click());
  await page.waitForFunction(()=>document.querySelector('[data-week-status]').textContent.includes('3 января'));
  assert.equal(await page.$eval('.schedule__bar',e=>e.style.gridColumn),'2 / 9','event is clipped to the week across the year boundary');
  assert.equal(await page.$eval('.schedule__city',e=>e.textContent),'<b>Тест</b>');
  assert.equal(await page.$$('.schedule__city b').then(e=>e.length),0,'external text is not parsed as HTML');
  await page.reload({waitUntil:'load'});
  await page.$eval('[data-week-next]',e=>e.click());await page.waitForFunction(()=>document.querySelector('[data-week-label]').textContent.includes('ноября'));
  assert.match(await page.$eval('[data-week-status]',e=>e.textContent),/26 октября.*1 ноября/);
  await page.$eval('[data-week-next]',e=>e.click());await page.waitForFunction(()=>document.querySelector('[data-week-next]').disabled);
  await page.goto(`${base}/about.html`,{waitUntil:'load'});
  assert.equal(await page.$$eval('.faq details[open]',e=>e.length),6);
  await page.$eval('.faq summary',e=>e.click());assert.equal(await page.$eval('.faq details',e=>e.open),false);
  await page.$eval('.faq summary',e=>e.focus());await page.keyboard.press('Space');
  assert.equal(await page.$eval('.faq details',e=>e.open),true,'FAQ opens with Space');
  await page.keyboard.press('Enter');assert.equal(await page.$eval('.faq details',e=>e.open),false,'FAQ closes with Enter');
  await page.setViewport({width:375,height:900});
  assert.equal(await page.$eval('.faq__details',e=>Math.round(e.getBoundingClientRect().width)),335,'FAQ stays within its mobile column');
  await page.close();
  if(failures.length) throw new Error(JSON.stringify(failures,null,2));
  console.log(`PASS: ${pages.length * widths.length} размеров страниц, ресурсы, слайдер, reduced motion, календарь, FAQ.`);
} finally { await browser.close(); server.close(); }
