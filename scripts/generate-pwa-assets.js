// scripts/generate-pwa-assets.js
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const SRC_DIR = path.join(process.cwd(), "public", "lovable-uploads");
const OUT_ICON_DIR = path.join(process.cwd(), "public", "icons");
const OUT_SPLASH_DIR = path.join(process.cwd(), "public", "splash");
const OUT_ANDROID_DIR = path.join(process.cwd(), "public", "android");

// Use the actual Thingtrax logo from uploads
const SRC_PNG = path.join(SRC_DIR, "4fec4d14-a56e-4a44-8256-ac94aa43da5c.png");
const SRC = SRC_PNG;

if (!fs.existsSync(SRC)) {
  console.error("❌ Missing Thingtrax logo at:", SRC);
  console.error("Expected path: public/lovable-uploads/4fec4d14-a56e-4a44-8256-ac94aa43da5c.png");
  process.exit(1);
}

console.log("🚀 Generating PWA assets with official Thingtrax logo...");

fs.mkdirSync(OUT_ICON_DIR, { recursive: true });
fs.mkdirSync(OUT_SPLASH_DIR, { recursive: true });
fs.mkdirSync(OUT_ANDROID_DIR, { recursive: true });

// ---------- Standard + maskable icons ----------
const iconSizes = [192, 256, 384, 512, 1024];
const maskable = [192, 512];

async function genStandardIcons() {
  for (const size of iconSizes) {
    await sharp(SRC).resize(size, size, { fit: "contain", background: { r:0,g:0,b:0,alpha:0 } })
      .png().toFile(path.join(OUT_ICON_DIR, `icon-${size}.png`));
  }
  for (const size of maskable) {
    await sharp(SRC).resize(size, size, { fit: "contain", background: { r:11,g:18,b:32,alpha:1 } }) // Thingtrax dark
      .png().toFile(path.join(OUT_ICON_DIR, `maskable-${size}.png`));
  }
  await sharp(SRC).resize(180,180,{ fit:"contain", background:{ r:11,g:18,b:32,alpha:1 } }) // Thingtrax dark
    .png().toFile(path.join(OUT_ICON_DIR, "apple-touch-icon-180.png"));
}

// ---------- Android adaptive icons ----------
async function genAdaptiveIcons() {
  const SIZE = 432, inset = Math.floor(SIZE * 0.72);
  const fg = await sharp(SRC).resize(inset, inset, { fit:"contain", background:{ r:0,g:0,b:0,alpha:0 } }).png().toBuffer();
  await sharp({ create:{ width:SIZE, height:SIZE, channels:4, background:{ r:0,g:0,b:0,alpha:0 } } })
    .composite([{ input: fg, gravity:"center" }]).png().toFile(path.join(OUT_ANDROID_DIR, "ic_foreground.png"));
  await sharp({ create:{ width:SIZE, height:SIZE, channels:4, background:{ r:11,g:18,b:32,alpha:1 } } }) // Thingtrax dark
    .png().toFile(path.join(OUT_ANDROID_DIR, "ic_background.png"));
  const mono = await sharp(SRC).resize(inset, inset, { fit:"contain", background:{ r:0,g:0,b:0,alpha:0 } })
    .png().toColourspace("b-w").modulate({ brightness: 2.0 }).toBuffer();
  await sharp({ create:{ width:SIZE, height:SIZE, channels:4, background:{ r:0,g:0,b:0,alpha:0 } } })
    .composite([{ input: mono, gravity:"center" }]).png().toFile(path.join(OUT_ANDROID_DIR, "ic_monochrome.png"));
}

// ---------- Splash screens (dark/light × portrait/landscape) ----------
const devices = [
  { key:"iphone-se-2-3",    w:750,  h:1334, media:"(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)", scalePortrait:0.38, scaleLandscape:0.34 },
  { key:"iphone-11-pro",    w:1125, h:2436, media:"(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)", scalePortrait:0.38, scaleLandscape:0.34 },
  { key:"iphone-11-13",     w:1170, h:2532, media:"(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)", scalePortrait:0.40, scaleLandscape:0.36 },
  { key:"iphone-11pm-12pm", w:1284, h:2778, media:"(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)", scalePortrait:0.40, scaleLandscape:0.36 },
  { key:"iphone-15pro",     w:1179, h:2556, media:"(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)", scalePortrait:0.40, scaleLandscape:0.36 },
  { key:"iphone-15pm",      w:1290, h:2796, media:"(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)", scalePortrait:0.40, scaleLandscape:0.36 },
  { key:"ipad-mini",        w:1536, h:2048, media:"(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)", scalePortrait:0.44, scaleLandscape:0.40 },
  { key:"ipad-pro-11",      w:1668, h:2388, media:"(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)", scalePortrait:0.44, scaleLandscape:0.40 },
  { key:"ipad-pro-12-9",    w:2048, h:2732, media:"(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)", scalePortrait:0.46, scaleLandscape:0.42 },
];
const theme = { dark:{ bg:{ r:11,g:18,b:32,alpha:1 } }, light:{ bg:{ r:248,g:250,b:252,alpha:1 } } }; // Thingtrax colors

function splashName({ key, w, h, orient, scheme }) {
  return `${key}-${orient}-${scheme}-${w}x${h}.png`;
}
async function compositeSplash({ w, h, scheme, scale }) {
  const bg = theme[scheme].bg;
  const canvas = sharp({ create:{ width:w, height:h, channels:4, background:bg } }).png();
  const logoSize = Math.floor(Math.min(w, h) * scale);
  const logo = await sharp(SRC).resize(logoSize, logoSize, { fit:"contain", background:bg }).png().toBuffer();
  return canvas.composite([{ input: logo, gravity:"center" }]);
}
async function genSplash() {
  for (const dev of devices) {
    for (const scheme of ["dark","light"]) {
      const pOut = path.join(OUT_SPLASH_DIR, splashName({ ...dev, orient:"portrait", scheme, w:dev.w, h:dev.h }));
      await (await compositeSplash({ w:dev.w, h:dev.h, scheme, scale:dev.scalePortrait })).toFile(pOut);
      const lOut = path.join(OUT_SPLASH_DIR, splashName({ ...dev, orient:"landscape", scheme, w:dev.h, h:dev.w }));
      await (await compositeSplash({ w:dev.h, h:dev.w, scheme, scale:dev.scaleLandscape })).toFile(lOut);
    }
  }
}

(async () => {
  await genStandardIcons();
  await genAdaptiveIcons();
  await genSplash();
  console.log("✅ Generated PWA assets with official Thingtrax logo in /public/icons, /public/android, /public/splash");
})();