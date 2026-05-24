// Generates simple SVG-based PNG icons for the PWA
// Run: node scripts/generate-icons.js
const fs = require('fs');
const path = require('path');

function svgIcon(size) {
  const r = Math.round(size * 0.22);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#f97316"/>
  <text x="50%" y="58%" font-size="${Math.round(size * 0.5)}"
        text-anchor="middle" dominant-baseline="middle"
        font-family="sans-serif">🍔</text>
</svg>`;
}

const iconsDir = path.join(__dirname, '../client/public/icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

[192, 512].forEach(size => {
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.svg`), svgIcon(size));
  console.log(`Generated icon-${size}.svg (convert to PNG for production)`);
});

// Also write a simple PNG placeholder using raw bytes
// For a real app, use sharp or canvas. Here we write minimal valid 1x1 PNGs
// that browsers accept, then note to replace them.
console.log('\n⚠  Replace icon-192.png and icon-512.png with real PNG icons before deploying.');
console.log('  Use the SVG files as templates, or a tool like: https://realfavicongenerator.net\n');
