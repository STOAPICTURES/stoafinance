import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// SVG definition for standard icon
const standardSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E201E" />
      <stop offset="100%" stop-color="#121312" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E8833A" />
      <stop offset="100%" stop-color="#C06014" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#F3F4ED" />
    </linearGradient>
  </defs>

  <!-- Background rounded rect -->
  <rect width="512" height="512" rx="108" fill="url(#bgGrad)" />

  <!-- Outer aperture ring border -->
  <circle cx="256" cy="230" r="160" fill="none" stroke="#2E302E" stroke-width="8" />
  <circle cx="256" cy="230" r="148" fill="#181A18" stroke="url(#goldGrad)" stroke-width="4" stroke-dasharray="8 6" />

  <!-- Camera Aperture Blades Accent -->
  <g stroke="url(#goldGrad)" stroke-width="3" stroke-linecap="round" opacity="0.6">
    <line x1="256" y1="86" x2="330" y2="150" />
    <line x1="390" y1="180" x2="360" y2="280" />
    <line x1="350" y1="340" x2="256" y2="370" />
    <line x1="180" y1="345" x2="140" y2="260" />
    <line x1="140" y1="180" x2="210" y2="110" />
  </g>

  <!-- Golden Center Glow -->
  <circle cx="256" cy="230" r="85" fill="#C06014" opacity="0.12" />

  <!-- Stylized Elegant "S" Monogram -->
  <path d="M 295 175 C 295 150 275 135 252 135 C 220 135 200 155 200 185 C 200 225 295 215 295 270 C 295 305 270 325 242 325 C 210 325 188 300 188 275" 
        fill="none" 
        stroke="url(#accentGrad)" 
        stroke-width="26" 
        stroke-linecap="round" />
  
  <path d="M 295 175 C 295 150 275 135 252 135 C 220 135 200 155 200 185 C 200 225 295 215 295 270 C 295 305 270 325 242 325 C 210 325 188 300 188 275" 
        fill="none" 
        stroke="url(#goldGrad)" 
        stroke-width="12" 
        stroke-linecap="round" />

  <!-- Lens reflection spot -->
  <circle cx="225" cy="190" r="8" fill="#FFFFFF" opacity="0.8" />
  <circle cx="215" cy="202" r="4" fill="#FFFFFF" opacity="0.5" />

  <!-- Typography: STOA FINANCE -->
  <text x="256" y="420" font-family="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" font-size="44" font-weight="800" letter-spacing="8" fill="#F3F4ED" text-anchor="middle">STOA</text>
  <text x="256" y="455" font-family="'JetBrains Mono', monospace" font-size="19" font-weight="600" letter-spacing="6" fill="#C06014" text-anchor="middle">FINANCE</text>
</svg>
`;

// SVG definition for maskable icon (has 20% safe zone padding, full bleed background)
const maskableSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E201E" />
      <stop offset="100%" stop-color="#121312" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E8833A" />
      <stop offset="100%" stop-color="#C06014" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#F3F4ED" />
    </linearGradient>
  </defs>

  <!-- Full bleed background for maskable -->
  <rect width="512" height="512" fill="url(#bgGrad)" />

  <!-- Scaled content inside safe zone (80% diameter / center 400px circle) -->
  <g transform="translate(51.2, 51.2) scale(0.8)">
    <circle cx="256" cy="230" r="160" fill="none" stroke="#2E302E" stroke-width="8" />
    <circle cx="256" cy="230" r="148" fill="#181A18" stroke="url(#goldGrad)" stroke-width="4" stroke-dasharray="8 6" />

    <g stroke="url(#goldGrad)" stroke-width="3" stroke-linecap="round" opacity="0.6">
      <line x1="256" y1="86" x2="330" y2="150" />
      <line x1="390" y1="180" x2="360" y2="280" />
      <line x1="350" y1="340" x2="256" y2="370" />
      <line x1="180" y1="345" x2="140" y2="260" />
      <line x1="140" y1="180" x2="210" y2="110" />
    </g>

    <circle cx="256" cy="230" r="85" fill="#C06014" opacity="0.12" />

    <path d="M 295 175 C 295 150 275 135 252 135 C 220 135 200 155 200 185 C 200 225 295 215 295 270 C 295 305 270 325 242 325 C 210 325 188 300 188 275" 
          fill="none" 
          stroke="url(#accentGrad)" 
          stroke-width="26" 
          stroke-linecap="round" />
    
    <path d="M 295 175 C 295 150 275 135 252 135 C 220 135 200 155 200 185 C 200 225 295 215 295 270 C 295 305 270 325 242 325 C 210 325 188 300 188 275" 
          fill="none" 
          stroke="url(#goldGrad)" 
          stroke-width="12" 
          stroke-linecap="round" />

    <circle cx="225" cy="190" r="8" fill="#FFFFFF" opacity="0.8" />
    <circle cx="215" cy="202" r="4" fill="#FFFFFF" opacity="0.5" />

    <text x="256" y="420" font-family="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" font-size="44" font-weight="800" letter-spacing="8" fill="#F3F4ED" text-anchor="middle">STOA</text>
    <text x="256" y="455" font-family="'JetBrains Mono', monospace" font-size="19" font-weight="600" letter-spacing="6" fill="#C06014" text-anchor="middle">FINANCE</text>
  </g>
</svg>
`;

async function generate() {
  console.log('Generating PWA icons...');
  
  // Write SVG source files
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), standardSvg);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), standardSvg);

  const standardBuffer = Buffer.from(standardSvg);
  const maskableBuffer = Buffer.from(maskableSvg);

  // 512x512 standard
  await sharp(standardBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('Created pwa-512x512.png');

  // 192x192 standard
  await sharp(standardBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('Created pwa-192x192.png');

  // 512x512 maskable
  await sharp(maskableBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('Created pwa-maskable-512x512.png');

  // 180x180 Apple Touch Icon
  await sharp(standardBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');

  // Favicon 64x64 & 32x32
  await sharp(standardBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon-64.png'));

  await sharp(standardBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32.png'));

  console.log('All icons generated successfully!');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
