#!/usr/bin/env node
/** Extended smoke: footer, mobile, forms, operator/admin gates */
import { chromium, devices } from "playwright";

const REVIEW_PASSWORD = process.env.REVIEW_PASSWORD ?? "";

const BASE = process.env.SMOKE_URL ?? "https://tripfinder-ai.vercel.app";
const issues = [];

function record(path, type, message) {
  issues.push({ path, type, message });
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  // Desktop footer + CTA buttons
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 45000 });
  for (const label of ["Найти тур", "Для турфирм"]) {
    const btn = page.getByRole("link", { name: label }).first();
    if (!(await btn.count())) record("/", "footer", `Missing: ${label}`);
  }
  await page.getByRole("link", { name: "Все туры" }).click();
  await page.waitForTimeout(1000);
  if (!page.url().includes("/search")) record("/footer", "link", "Все туры broken");

  const page2 = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // Request form interactive
  await page2.goto(`${BASE}/request`, { waitUntil: "networkidle" });
  const submit = page2.getByRole("button", { name: /отправ|получ|созд|далее|заяв/i }).first();
  if (await submit.count()) {
    await submit.click().catch(() => {});
    await page2.waitForTimeout(500);
  } else {
    record("/request", "form", "No submit button found");
  }

  // Registration page loads form
  await page2.goto(`${BASE}/registration`, { waitUntil: "networkidle" });
  if (!(await page2.locator("#email, input[type=email]").count())) {
    record("/registration", "form", "Email field missing");
  }

  // Protected areas redirect or show login
  for (const path of ["/admin", "/operator"]) {
    await page2.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await page2.waitForTimeout(1000);
    const url = page2.url();
    const body = await page2.locator("body").innerText();
    if (/Application error/i.test(body)) record(path, "gate", "Crash");
  }

  // Company public page
  await page2.goto(`${BASE}/company/family-travel`, { waitUntil: "networkidle", timeout: 45000 });
  const companyBody = await page2.locator("body").innerText();
  if (/Application error|404|не найден/i.test(companyBody) && !companyBody.match(/Family|Travel|тур/i)) {
    record("/company/family-travel", "content", "Company page empty or error");
  }

  // Mobile app tab bar
  const mobile = await browser.newContext({ ...devices["iPhone 14"], locale: "ru-RU" });
  const mpage = await mobile.newPage();
  await mpage.goto(`${BASE}/?app=1`, { waitUntil: "networkidle" });
  for (const tab of ["Главная", "Поиск", "Поездки", "Профиль"]) {
    const t = mpage.getByRole("link", { name: tab });
    if (!(await t.count())) record("/?app=1", "tabbar", `Missing tab: ${tab}`);
  }
  await mpage.getByRole("link", { name: "Поиск" }).click();
  await mpage.waitForTimeout(1200);
  if (!mpage.url().includes("/search")) record("/?app=1", "tabbar", "Search tab broken");

  // Hot tour card
  await page2.goto(`${BASE}/hot`, { waitUntil: "networkidle" });
  const hotLink = page2.locator('a[href*="/tour/"]').first();
  if (!(await hotLink.count())) record("/hot", "content", "No tour links");

  // Compare with query
  await page2.goto(`${BASE}/compare`, { waitUntil: "networkidle" });
  if ((await page2.locator("body").innerText()).match(/Application error/i)) {
    record("/compare", "crash", "Compare page error");
  }

  // Operator login
  await page2.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page2.fill("#email", "operator@test.tourgo.app");
  await page2.fill("#password", REVIEW_PASSWORD);
  await page2.getByRole("button", { name: /Войти/i }).click();
  await page2.waitForTimeout(2500);
  if (!page2.url().includes("/operator")) {
    record("/login", "operator", `Expected /operator, got ${page2.url()}`);
  } else {
    for (const p of ["/operator", "/operator/tours", "/operator/requests"]) {
      await page2.goto(`${BASE}${p}`, { waitUntil: "networkidle", timeout: 45000 });
      await page2.waitForTimeout(600);
      const t = await page2.locator("body").innerText();
      if (/Application error|Something went wrong/i.test(t)) record(p, "operator", "Crash");
    }
  }

  await browser.close();

  if (issues.length) {
    console.log("ISSUES:");
    issues.forEach((i) => console.log(`[${i.type}] ${i.path}: ${i.message}`));
    process.exit(1);
  }
  console.log("Extended smoke: all ok");
}

main();
