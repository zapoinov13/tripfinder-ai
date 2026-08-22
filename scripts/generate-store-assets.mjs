#!/usr/bin/env node
/**
 * Generates App Store / Google Play icons, splash screens, and feature graphic
 * from store/source/icon-1024.png
 */
import { mkdir, copyFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const sourceIcon = path.join(root, "store/source/icon-1024.png");
const sourceFeature = path.join(root, "store/source/feature-graphic-source.png");

const INK = "#1c2433";

const androidMipmaps = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

const androidForeground = {
  mdpi: 108,
  hdpi: 162,
  xhdpi: 216,
  xxhdpi: 324,
  xxxhdpi: 432,
};

const splashSizes = {
  "drawable-port-mdpi": { w: 320, h: 480 },
  "drawable-port-hdpi": { w: 480, h: 800 },
  "drawable-port-xhdpi": { w: 720, h: 1280 },
  "drawable-port-xxhdpi": { w: 1080, h: 1920 },
  "drawable-port-xxxhdpi": { w: 1440, h: 2560 },
  "drawable-land-mdpi": { w: 480, h: 320 },
  "drawable-land-hdpi": { w: 800, h: 480 },
  "drawable-land-xhdpi": { w: 1280, h: 720 },
  "drawable-land-xxhdpi": { w: 1920, h: 1080 },
  "drawable-land-xxxhdpi": { w: 2560, h: 1440 },
  drawable: { w: 480, h: 320 },
};

async function writePng(buffer, target) {
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
}

async function iconBuffer(size, padding = 0) {
  const inner = size - padding * 2;
  const resized = await sharp(sourceIcon).resize(inner, inner, { fit: "contain" }).png().toBuffer();
  if (padding === 0) return resized;
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: INK,
    },
  })
    .composite([{ input: resized, gravity: "center" }])
    .png()
    .toBuffer();
}

async function splashBuffer(width, height) {
  const logoSize = Math.round(Math.min(width, height) * 0.22);
  const logo = await sharp(sourceIcon).resize(logoSize, logoSize, { fit: "contain" }).png().toBuffer();
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: INK,
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
}

async function main() {
  console.log("Generating store assets from", sourceIcon);

  const storeIcons = path.join(root, "store/icons");
  await mkdir(storeIcons, { recursive: true });

  const icon1024 = await iconBuffer(1024);
  await writePng(icon1024, path.join(storeIcons, "icon-1024.png"));
  await writePng(await iconBuffer(512), path.join(storeIcons, "icon-512.png"));
  await writePng(await iconBuffer(192), path.join(storeIcons, "icon-192.png"));

  const iosIcon = path.join(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");
  await writePng(icon1024, iosIcon);

  for (const [density, size] of Object.entries(androidMipmaps)) {
    const dir = path.join(root, `android/app/src/main/res/mipmap-${density}`);
    const png = await iconBuffer(size, Math.round(size * 0.08));
    await writePng(png, path.join(dir, "ic_launcher.png"));
    await writePng(png, path.join(dir, "ic_launcher_round.png"));
  }

  for (const [density, size] of Object.entries(androidForeground)) {
    const dir = path.join(root, `android/app/src/main/res/mipmap-${density}`);
    const fg = await iconBuffer(size, Math.round(size * 0.18));
    await writePng(fg, path.join(dir, "ic_launcher_foreground.png"));
  }

  await writeFile(
    path.join(root, "android/app/src/main/res/values/ic_launcher_background.xml"),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${INK}</color>\n</resources>\n`,
  );

  const iosSplashDir = path.join(root, "ios/App/App/Assets.xcassets/Splash.imageset");
  const splash2732 = await splashBuffer(2732, 2732);
  for (const name of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
    await writePng(splash2732, path.join(iosSplashDir, name));
  }

  const androidRes = path.join(root, "android/app/src/main/res");
  for (const [folder, { w, h }] of Object.entries(splashSizes)) {
    await writePng(await splashBuffer(w, h), path.join(androidRes, folder, "splash.png"));
  }

  if (await sharp(sourceFeature).metadata().catch(() => null)) {
    const feature = await sharp(sourceFeature)
      .resize(1024, 500, { fit: "cover", position: "centre" })
      .png()
      .toBuffer();
    await writePng(feature, path.join(root, "store/icons/feature-graphic-1024x500.png"));
  }

  console.log("Done. Icons, splash screens, and feature graphic updated.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
