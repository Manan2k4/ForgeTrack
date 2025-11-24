/* Icon generation script for Transporter Panel
 * Generates multi-size PNG icons and updates manifest.json icons array.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
// Attempt to locate prince_logo.png in several possible locations:
const POSSIBLE_SOURCES = [
  path.resolve(ROOT, 'prince_logo.png'), // panel local copy (if user placed it here)
  path.resolve(ROOT, '..', 'prince_logo.png'), // workspace root (common case)
  path.resolve(ROOT, '..', '..', 'prince_logo.png') // one level higher if nested deeper
];
const SOURCE = POSSIBLE_SOURCES.find(p => fs.existsSync(p));
const PUBLIC_DIR = path.resolve(ROOT, 'public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');
const MANIFEST_PATH = path.join(PUBLIC_DIR, 'manifest.json');

const sizes = [72, 96, 128, 144, 152, 192, 256, 384, 512];

async function ensureDirs() {
  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR);
  if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR);
}

async function generateIcons() {
  if (!SOURCE) {
    console.error('Source image prince_logo.png not found. Tried:\n' + POSSIBLE_SOURCES.join('\n'));
    console.error('Place prince_logo.png in transporter-panel/ or workspace root and rerun `npm run icons`.');
    process.exit(1);
  }
  await ensureDirs();
  for (const size of sizes) {
    const outPath = path.join(ICONS_DIR, `icon-${size}.png`);
    await sharp(SOURCE).resize(size, size).png().toFile(outPath);
    console.log('Generated', outPath);
  }
  // Maskable variant
  const maskablePath = path.join(ICONS_DIR, 'maskable-192.png');
  await sharp(SOURCE).resize(192, 192).png().toFile(maskablePath);
  console.log('Generated', maskablePath);
}

function updateManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('Manifest file not found at', MANIFEST_PATH);
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  manifest.icons = [
    ...sizes.map(s => ({ src: `/icons/icon-${s}.png`, sizes: `${s}x${s}`, type: 'image/png' })),
    { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' }
  ];
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log('Updated manifest icons array.');
}

async function run() {
  await generateIcons();
  updateManifest();
  console.log('Icon generation complete.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});