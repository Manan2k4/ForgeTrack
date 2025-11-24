#!/usr/bin/env node
/**
 * Icon generation script.
 * Uses the root-level prince_logo.png as source and outputs multiple sizes to public/icons/.
 * Run after installing dependencies: npm install
 * Then: npm run icons
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const projectRoot = path.resolve(__dirname, '..', '..');
const sourceCandidates = [
  path.join(projectRoot, 'prince_logo.png'), // root image (requested)
  path.join(projectRoot, 'Admin-panel', 'public', 'prince_logo.png') // fallback
];

const source = sourceCandidates.find(p => fs.existsSync(p));
if (!source) {
  console.error('Source image prince_logo.png not found in root or public/.');
  process.exit(1);
}

const outDir = path.join(projectRoot, 'Admin-panel', 'public', 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Standard PWA sizes
const sizes = [72, 96, 128, 144, 152, 192, 256, 384, 512];

// Background color for padding when source is not square or needs maskable safe-area
const background = { r: 11, g: 61, b: 145, alpha: 1 }; // #0b3d91

async function generate() {
  const metadata = await sharp(source).metadata();
  const isPng = metadata.format === 'png';
  console.log(`Source: ${source} (${metadata.width}x${metadata.height}, ${metadata.format})`);

  for (const size of sizes) {
    const outFile = path.join(outDir, `prince-${size}.png`);
    await sharp(source)
      .resize(size, size, { fit: 'contain', background })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(outFile);
    console.log('✓', outFile);
  }

  // Maskable variant (extra padding inside 512 canvas)
  const maskableFile = path.join(outDir, 'prince-512-maskable.png');
  await sharp(source)
    .resize(448, 448, { fit: 'contain', background }) // leave ~12% padding
    .extend({ top: 32, bottom: 32, left: 32, right: 32, background })
    .resize(512, 512) // ensure final size
    .png({ compressionLevel: 9 })
    .toFile(maskableFile);
  console.log('✓', maskableFile, '(maskable)');

  // Update manifest.json icons section automatically (non-destructive if file exists)
  const manifestPath = path.join(projectRoot, 'Admin-panel', 'public', 'manifest.json');
  try {
    const manifestRaw = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestRaw);
    manifest.icons = [
      ...sizes.map(s => ({ src: `/icons/prince-${s}.png`, sizes: `${s}x${s}`, type: 'image/png' })),
      { src: '/icons/prince-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ];
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('✓ manifest.json updated with new icons');
  } catch (e) {
    console.warn('Manifest update skipped:', e.message);
  }

  console.log('\nAll icons generated. Redeploy to apply changes.');
}

generate().catch(err => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});