#!/usr/bin/env node
/**
 * Captures App Store / Google Play screenshots from production (?app=1 compact mode).
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const baseUrl = process.env.STORE_SCREENSHOT_URL ?? "https://tripfinder-ai.vercel.app";

const captures = [
  { file: "01-home.png", path: "/?app=1", wait: 2500 },
  { file: "02-search.png", path: "/search?app=1", wait: 2000 },
  { file: "03-hot-tours.png", path: "/hot?app=1", wait: 2000 },
  { file: "04-destinations.png", path: "/destinations?app=1", wait: 2000 },
  { file: "05-request.png", path: "/request?app=1", wait: 2000 },
  { file: "06-login.png", path: "/login?app=1", wait: 1500 },
];

async function captureSet(browser, deviceName, outDir) {
  const device = devices[deviceName];
  const context = await browser.newContext({
    ...device,
    locale: "ru-RU",
  });
  const page = await context.newPage();
  await mkdir(outDir, { recursive: true });

  for (const shot of captures) {
    const url = `${baseUrl}${shot.path}`;
    console.log(`  ${deviceName}: ${shot.file}`);
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(shot.wait);
    const target = path.join(outDir, shot.file);
    await page.screenshot({ path: target, fullPage: false, animations: "disabled" });
  }

  await context.close();
}

async function normalizeScreenshot(sharp, file, width, height, bg = "#0f172a") {
  const target = file;
  await sharp(file)
    .resize(width, height, { fit: "contain", position: "top", background: bg })
    .png()
    .toFile(`${target}.tmp`);
  await sharp(`${target}.tmp`).png().toFile(target);
  const { unlink } = await import("node:fs/promises");
  await unlink(`${target}.tmp`);
}

async function main() {
  console.log("Capturing screenshots from", baseUrl);
  const browser = await chromium.launch({ headless: true });

  const ios67 = path.join(root, "store/screenshots/ios/6.7-inch");
  const ios65 = path.join(root, "store/screenshots/ios/6.5-inch");
  const androidPhone = path.join(root, "store/screenshots/android/phone");

  await captureSet(browser, "iPhone 14 Pro Max", ios67);

  const sharp = (await import("sharp")).default;
  await mkdir(ios65, { recursive: true });
  for (const shot of captures) {
    const src = path.join(ios67, shot.file);
    await normalizeScreenshot(sharp, src, 1290, 2796);
    await sharp(src)
      .resize(1284, 2778, { fit: "contain", position: "top", background: "#0f172a" })
      .png()
      .toFile(path.join(ios65, shot.file));
  }

  await captureSet(browser, "Pixel 7", androidPhone);

  for (const shot of captures) {
    await normalizeScreenshot(
      sharp,
      path.join(androidPhone, shot.file),
      1080,
      1920,
    );
  }

  await browser.close();
  console.log("Screenshots saved to store/screenshots/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
