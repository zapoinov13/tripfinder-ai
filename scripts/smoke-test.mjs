#!/usr/bin/env node
/**
 * Smoke-test all public routes + key flows on production.
 */
import { chromium } from "playwright";

const BASE = process.env.SMOKE_URL ?? "https://tripfinder-ai.vercel.app";
const REVIEW_PASSWORD = process.env.REVIEW_PASSWORD ?? "";

const publicRoutes = [
  "/",
  "/about",
  "/search",
  "/hot",
  "/destinations",
  "/destination/uae",
  "/excursions",
  "/assistance",
  "/experiences",
  "/request",
  "/login",
  "/registration",
  "/for-companies",
  "/for-operators",
  "/company-signup",
  "/support",
  "/privacy",
  "/terms",
  "/favorites",
  "/compare",
  "/notifications",
  "/premium",
  "/ai-search",
  "/profile",
  "/profile/trips",
  "/profile/favorites",
  "/profile/requests",
  "/profile/messages",
  "/profile/settings",
  "/profile/ai",
  "/?app=1",
  "/search?app=1",
  "/login?app=1",
];

const issues = [];

async function checkRoute(page, path) {
  const url = `${BASE}${path}`;
  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(err.message));

  let response;
  try {
    response = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(800);
  } catch (err) {
    issues.push({ path, type: "navigation", message: String(err) });
    return;
  }

  const status = response?.status() ?? 0;
  if (status >= 400) {
    issues.push({ path, type: "http", message: `HTTP ${status}` });
  }

  const title = await page.title();
  if (!title || title.includes("Error") || title.includes("404")) {
    issues.push({ path, type: "title", message: title || "(empty)" });
  }

  const bodyText = await page.locator("body").innerText().catch(() => "");
  if (/Application error|Something went wrong|Internal Server Error/i.test(bodyText)) {
    issues.push({ path, type: "crash", message: "Error page visible" });
  }

  for (const e of pageErrors) {
    if (!/ResizeObserver|favicon|Failed to load resource.*404/i.test(e)) {
      issues.push({ path, type: "pageerror", message: e.slice(0, 200) });
    }
  }

  for (const e of consoleErrors) {
    if (
      !/ResizeObserver|favicon|Failed to load resource|net::ERR|images\.unsplash/i.test(e)
    ) {
      issues.push({ path, type: "console", message: e.slice(0, 200) });
    }
  }
}

async function testLogin(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 45000 });
  await page.fill("#email", "tourist@test.tourgo.app");
  await page.fill("#password", REVIEW_PASSWORD);
  await page.getByRole("button", { name: /Войти/i }).click();
  await page.waitForTimeout(2500);

  const url = page.url();
  if (!url.includes("/profile")) {
    issues.push({ path: "/login", type: "login", message: `Expected /profile, got ${url}` });
    return;
  }

  const profileRoutes = ["/profile", "/profile/trips", "/profile/favorites", "/profile/settings"];
  for (const p of profileRoutes) {
    await page.goto(`${BASE}${p}`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(600);
    const text = await page.locator("body").innerText();
    if (/Application error|Something went wrong/i.test(text)) {
      issues.push({ path: p, type: "auth-page", message: "Crash after login" });
    }
  }
}

async function testHomeButtons(page) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 45000 });

  const headerLinks = [
    { name: "Туры", href: "/search" },
    { name: "Направления", href: "/destinations" },
    { name: "Заявка", href: "/request" },
  ];

  for (const link of headerLinks) {
    const el = page.getByRole("link", { name: link.name, exact: true }).first();
    if (!(await el.count())) {
      issues.push({ path: "/", type: "nav", message: `Missing header link: ${link.name}` });
      continue;
    }
    await el.click();
    await page.waitForTimeout(1200);
    if (!page.url().includes(link.href)) {
      issues.push({
        path: "/",
        type: "nav",
        message: `Link ${link.name} → ${page.url()} (expected ${link.href})`,
      });
    }
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  }
}

async function testSearchSubmit(page) {
  await page.goto(`${BASE}/search`, { waitUntil: "networkidle", timeout: 45000 });
  const cards = page.locator('[data-tour-card], a[href*="/tour/"]');
  const count = await cards.count();
  if (count === 0) {
    issues.push({ path: "/search", type: "content", message: "No tour cards found" });
    return;
  }
  await cards.first().click();
  await page.waitForTimeout(1500);
  if (!page.url().includes("/tour/")) {
    issues.push({ path: "/search", type: "click", message: "Tour card click did not navigate" });
  }
}

async function main() {
  console.log("Smoke testing", BASE);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "ru-RU", viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  for (const path of publicRoutes) {
    process.stdout.write(`  ${path} ... `);
    await checkRoute(page, path);
    console.log(issues.some((i) => i.path === path) ? "FAIL" : "ok");
  }

  console.log("\nHome nav buttons...");
  await testHomeButtons(page);

  console.log("Search → tour...");
  await testSearchSubmit(page);

  console.log("Login flow...");
  await testLogin(page);

  await browser.close();

  const unique = issues.filter(
    (item, idx, arr) =>
      arr.findIndex((x) => x.path === item.path && x.type === item.type && x.message === item.message) ===
      idx,
  );

  if (unique.length) {
    console.log("\n=== ISSUES ===");
    for (const i of unique) console.log(`[${i.type}] ${i.path}: ${i.message}`);
    process.exit(1);
  }

  console.log("\nAll checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
