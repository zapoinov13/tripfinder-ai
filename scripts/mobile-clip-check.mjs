#!/usr/bin/env node
/**
 * Обрезанный текст по всему сайту на телефоне.
 *
 * Многоточие вместо половины слова читается как поломка, поэтому ищем места,
 * где содержимое шире контейнера, — так же, как это видит человек.
 */
import { chromium } from "/home/user/tripfinder-ai/node_modules/playwright/index.mjs";
/** Адрес собранного сайта: `npm run mobile:clip -- http://127.0.0.1:8779` */
const BASE = process.argv[2] ?? "http://127.0.0.1:8779";
const PAGES=["/","/search","/excursions","/stays","/cars","/sport","/assistance","/destinations","/destination/uae","/request","/premium","/about","/for-companies","/support"];
const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});
// 360 точек — самый узкий распространённый телефон: если текст помещается
// здесь, он поместится и на всех остальных.
const ctx=await b.newContext({viewport:{width:360,height:740}});
await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/,(r)=>r.abort());
const p=await ctx.newPage();
let total=0;
for (const path of PAGES) {
  await p.goto(BASE+path,{waitUntil:"domcontentloaded"});
  await p.waitForTimeout(1800);
  const clipped = await p.evaluate(() => {
    const out=[];
    document.querySelectorAll("h1,h2,h3,h4,p,span,a,button,li,dd,dt").forEach((el)=>{
      const t=(el.textContent||"").trim();
      if(!t||t.length<8||el.children.length>0) return;
      const st=getComputedStyle(el);
      const hidden = st.textOverflow==="ellipsis" || st.overflow==="hidden";
      if(el.scrollWidth>el.clientWidth+1 && hidden) out.push(t.slice(0,70));
    });
    return [...new Set(out)];
  });
  total += clipped.length;
  console.log(`${clipped.length?"ОБРЕЗАНО":"чисто   "} ${path}${clipped.length?": "+clipped.join(" | "):""}`);
}
console.log(total?`\nвсего обрезок: ${total}`:"\nобрезанного текста нет");
await b.close();
process.exit(total ? 1 : 0);
