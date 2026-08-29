#!/usr/bin/env node
/**
 * Первый экран телефона: обложка, подбор и разделы — и ничего больше.
 *
 * Витрина направлений должна начинаться со второго экрана на всех
 * распространённых размерах, включая самый маленький и самый большой.
 */
import { chromium } from "/home/user/tripfinder-ai/node_modules/playwright/index.mjs";
const BASE = process.argv[2] ?? "http://127.0.0.1:8779";
const DEVICES=[["iPhone SE",375,667],["iPhone 14",390,844],["iPhone 15 Pro Max",430,932],["Pixel 7",412,915]];
const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});
let bad=0;
for (const [name,w,h] of DEVICES) {
  const ctx=await b.newContext({viewport:{width:w,height:h}});
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/,(r)=>r.abort());
  const p=await ctx.newPage();
  await p.goto(BASE+"/",{waitUntil:"domcontentloaded"}); await p.waitForTimeout(2500);
  const m = await p.evaluate((h) => {
    const fold = h - 64;
    const rail = [...document.querySelectorAll("h2")].find((el)=>el.textContent.includes("Популярные направления"));
    const tiles = [...document.querySelectorAll("a")].filter((a)=>/Экскурсии|Спорт/.test(a.innerText));
    const tile = tiles[0]?.getBoundingClientRect();
    return { railTop: rail ? Math.round(rail.getBoundingClientRect().top) : null, fold, tileH: tile?Math.round(tile.height):0 };
  }, h);
  const ok = m.railTop === null || m.railTop >= m.fold;
  if(!ok) bad++;
  console.log(`${ok?"OK  ":"FAIL"} ${name.padEnd(18)} сгиб ${m.fold}  направления с ${m.railTop}  плитка ${m.tileH}px`);
  
  await ctx.close();
}
await b.close(); process.exit(bad?1:0);
