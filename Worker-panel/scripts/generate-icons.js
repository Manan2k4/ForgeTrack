#!/usr/bin/env node
// Generates multi-size icons for Worker panel using root prince_logo.png
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..', '..');
const sourcePath = [
  path.join(root, 'prince_logo.png'),
  path.join(root, 'Worker-panel', 'public', 'prince_logo.png')
].find(p => fs.existsSync(p));

if (!sourcePath) {
  console.error('Source prince_logo.png not found at repo root or Worker-panel/public/.');
  process.exit(1);
}

const outDir = path.join(root, 'Worker-panel', 'public', 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 256, 384, 512];
const background = { r: 11, g: 61, b: 145, alpha: 1 }; // brand color

async function run() {
  const meta = await sharp(sourcePath).metadata();
  console.log(`Source: ${sourcePath} (${meta.width}x${meta.height})`);
  for (const s of sizes) {
    const outFile = path.join(outDir, `prince-${s}.png`);
    await sharp(sourcePath).resize(s, s, { fit: 'contain', background }).png({ compressionLevel: 9 }).toFile(outFile);
    console.log('✓', outFile);
  }
  // Maskable variant
  const maskable = path.join(outDir, 'prince-512-maskable.png');
  await sharp(sourcePath)
    .resize(448, 448, { fit: 'contain', background })
    .extend({ top: 32, bottom: 32, left: 32, right: 32, background })
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(maskable);
  console.log('✓', maskable, '(maskable)');

  // Update manifest
  const manifestFile = path.join(root, 'Worker-panel', 'public', 'manifest.json');
  try {
    const raw = fs.readFileSync(manifestFile, 'utf-8');
    const manifest = JSON.parse(raw);
    manifest.icons = [
      ...sizes.map(s => ({ src: `/icons/prince-${s}.png`, sizes: `${s}x${s}`, type: 'image/png' })),
      { src: '/icons/prince-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ];
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
    console.log('✓ manifest.json updated');
  } catch (e) {
    console.warn('Manifest update skipped:', e.message);
  }

  console.log('\nWorker panel icons generated. Redeploy to apply.');
}

run().catch(err => { console.error(err); process.exit(1); });