const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const iconsDir = path.join(__dirname, "../public/icons");
const splashDir = path.join(__dirname, "../public/splash");

if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });
if (!fs.existsSync(splashDir)) fs.mkdirSync(splashDir, { recursive: true });

// Master SVG design: Luxury architectural crest with "SES" monogram & gold/cyan accents
const masterSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b0f17" />
      <stop offset="50%" stop-color="#111827" />
      <stop offset="100%" stop-color="#070a10" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="50%" stop-color="#d97706" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
    <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1024" height="1024" rx="220" fill="url(#bgGrad)" />

  <!-- Outer subtle border -->
  <rect x="32" y="32" width="960" height="960" rx="190" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="4" />

  <!-- Inner Gold Diamond Crest -->
  <polygon points="512,180 820,512 512,844 204,512" fill="none" stroke="url(#goldGrad)" stroke-width="8" opacity="0.6" />
  
  <!-- Architectural Hotel Crown / Pillars -->
  <path d="M 380 400 L 512 300 L 644 400 Z" fill="url(#goldGrad)" opacity="0.9" />
  <rect x="400" y="420" width="32" height="160" rx="6" fill="#38bdf8" opacity="0.85" />
  <rect x="496" y="420" width="32" height="160" rx="6" fill="url(#goldGrad)" opacity="0.95" />
  <rect x="592" y="420" width="32" height="160" rx="6" fill="#38bdf8" opacity="0.85" />
  <rect x="360" y="600" width="304" height="24" rx="6" fill="url(#goldGrad)" />

  <!-- Monogram text -->
  <text x="512" y="730" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="96" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="16">
    SES
  </text>
  <text x="512" y="790" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="28" font-weight="700" fill="#38bdf8" text-anchor="middle" letter-spacing="10">
    HOTEL OPERATIONS
  </text>
</svg>
`;

// Splash SVG design
function getSplashSvg(width, height) {
  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#0b0f17" />
  <g transform="translate(${width / 2 - 120}, ${height / 2 - 140}) scale(0.24)">
    ${masterSvg.replace(/<rect width="1024" height="1024"[^>]*\/>/, "")}
  </g>
  <text x="${width / 2}" y="${height / 2 + 100}" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="24" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="6">
    HOTEL SES
  </text>
  <text x="${width / 2}" y="${height / 2 + 130}" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="13" font-weight="600" fill="#8b97a8" text-anchor="middle" letter-spacing="2">
    Internal Operations Portal
  </text>
</svg>
`;
}

async function run() {
  console.log("Generating PWA Icon set...");
  const svgBuffer = Buffer.from(masterSvg);

  const iconSizes = [
    { name: "icon-72x72.png", size: 72 },
    { name: "icon-96x96.png", size: 96 },
    { name: "icon-128x128.png", size: 128 },
    { name: "icon-144x144.png", size: 144 },
    { name: "icon-152x152.png", size: 152 },
    { name: "icon-192x192.png", size: 192 },
    { name: "icon-384x384.png", size: 384 },
    { name: "icon-512x512.png", size: 512 },
    { name: "apple-touch-icon.png", size: 180 },
    { name: "favicon-32x32.png", size: 32 },
    { name: "favicon-16x16.png", size: 16 },
  ];

  for (const item of iconSizes) {
    await sharp(svgBuffer)
      .resize(item.size, item.size)
      .png()
      .toFile(path.join(iconsDir, item.name));
    console.log(`✓ Generated ${item.name} (${item.size}x${item.size})`);
  }

  // Also write favicon.ico from 32x32
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(__dirname, "../public/favicon.ico"));
  console.log("✓ Generated favicon.ico");

  console.log("Generating iOS Splash screens...");
  const splashSizes = [
    { name: "splash-640x1136.png", width: 640, height: 1136 },
    { name: "splash-750x1334.png", width: 750, height: 1334 },
    { name: "splash-1125x2436.png", width: 1125, height: 2436 },
    { name: "splash-1170x2532.png", width: 1170, height: 2532 },
    { name: "splash-1179x2556.png", width: 1179, height: 2556 },
    { name: "splash-1290x2796.png", width: 1290, height: 2796 },
    { name: "splash-1536x2048.png", width: 1536, height: 2048 },
    { name: "splash-2048x2732.png", width: 2048, height: 2732 },
  ];

  for (const item of splashSizes) {
    const splashSvg = Buffer.from(getSplashSvg(item.width, item.height));
    await sharp(splashSvg)
      .png()
      .toFile(path.join(splashDir, item.name));
    console.log(`✓ Generated ${item.name} (${item.width}x${item.height})`);
  }

  console.log("All PWA assets generated successfully!");
}

run().catch((err) => {
  console.error("Error generating assets:", err);
  process.exit(1);
});
