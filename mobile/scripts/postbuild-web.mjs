#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const indexPath = path.join(distDir, 'index.html');
const iconSource = path.join(projectRoot, 'assets/images/icon-square.png');

if (!fs.existsSync(distDir)) {
  console.error('[postbuild-web] dist/ não existe. Rode "expo export -p web" antes.');
  process.exit(1);
}

const manifest = {
  name: 'Promo Gestão',
  short_name: 'Promo Gestão',
  description: 'App do promotor - check-in, fotos e fechamento de visita.',
  lang: 'pt-BR',
  start_url: '/',
  display: 'standalone',
  background_color: '#0D1117',
  theme_color: '#0D1117',
  orientation: 'portrait',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

fs.writeFileSync(path.join(distDir, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));
console.log('[postbuild-web] manifest.webmanifest gerado.');

async function writeIcons() {
  if (!fs.existsSync(iconSource)) {
    console.warn('[postbuild-web] ícone fonte não encontrado em assets/images/icon-square.png');
    return;
  }

  try {
    const sharp = (await import('sharp')).default;
    await sharp(iconSource).resize(192, 192).png().toFile(path.join(distDir, 'icon-192.png'));
    await sharp(iconSource).resize(512, 512).png().toFile(path.join(distDir, 'icon-512.png'));
    await sharp(iconSource).resize(180, 180).png().toFile(path.join(distDir, 'apple-touch-icon.png'));
    console.log('[postbuild-web] icons redimensionados com sharp.');
  } catch {
    fs.copyFileSync(iconSource, path.join(distDir, 'icon-192.png'));
    fs.copyFileSync(iconSource, path.join(distDir, 'icon-512.png'));
    fs.copyFileSync(iconSource, path.join(distDir, 'apple-touch-icon.png'));
    console.warn('[postbuild-web] sharp indisponível; icons copiados sem resize.');
  }
}

await writeIcons();

const injections = `
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Promo Gestão" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
`;

let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(/<meta name="viewport"[^>]*>/, '');

if (!html.includes('manifest.webmanifest')) {
  html = html.replace('</head>', `${injections}</head>`);
  fs.writeFileSync(indexPath, html);
  console.log('[postbuild-web] index.html atualizado com manifest/PWA meta tags.');
} else {
  console.log('[postbuild-web] index.html já contém o manifest, nada a fazer.');
}

// Garantir que sw.js está no dist (Expo copia public/, mas validamos)
const swSrc = path.join(projectRoot, 'public/sw.js');
const swDst = path.join(distDir, 'sw.js');
if (fs.existsSync(swSrc) && !fs.existsSync(swDst)) {
  fs.copyFileSync(swSrc, swDst);
  console.log('[postbuild-web] sw.js copiado para dist/.');
}
