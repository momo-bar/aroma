// Rebuild the static site from a self-extracting single-file export of the page
// (the "__bundler" format: a JSON manifest of base64 assets, a JSON-encoded HTML
// template with UUID placeholders, and an id-to-UUID map exposed as
// window.__resources).
//
// Usage, from the repository root:
//   node tools/unpack-bundle.js "C:\path\to\Aroma Gourmet - Accueil.html" .
//
// It overwrites index.html and everything under assets/, js/ and vendor/.
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const [, , srcFile, outDir] = process.argv;
if (!srcFile || !outDir) {
  console.error('usage: node tools/unpack-bundle.js <export.html> <outDir>');
  process.exit(1);
}

const html = fs.readFileSync(srcFile, 'utf8');
function section(type) {
  const m = html.match(new RegExp('<script type="__bundler/' + type + '">([\\s\\S]*?)</script>'));
  return m ? JSON.parse(m[1]) : null;
}

const manifest = section('manifest');
let template = section('template');
const extResources = section('ext_resources') || [];
const pageOrder = section('page_order') || [];
if (!manifest || !template) {
  console.error('Not a __bundler export: manifest or template section missing.');
  process.exit(1);
}

const EXT = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif',
  'image/svg+xml': 'svg', 'video/mp4': 'mp4', 'video/webm': 'webm', 'text/css': 'css',
  'text/javascript': 'js', 'application/javascript': 'js', 'application/json': 'json',
  'font/woff2': 'woff2', 'font/woff': 'woff', 'font/ttf': 'ttf', 'text/html': 'html',
};

// Final paths for the files this export contains (auto-name -> path). Font
// roles come from the @font-face rules in the template; the two unnamed
// scripts were identified from their file headers.
const RENAMES = {
  'text_1.js': 'js/dc-runtime.js',
  'text_2.js': 'js/image-slot.js',
  'react.production.min.js': 'vendor/react.production.min.js',
  'react-dom.production.min.js': 'vendor/react-dom.production.min.js',
  'assets/font_3.woff2': 'assets/fonts/big-shoulders-display-vietnamese.woff2',
  'assets/font_4.woff2': 'assets/fonts/big-shoulders-display-latin-ext.woff2',
  'assets/font_5.woff2': 'assets/fonts/big-shoulders-display-latin.woff2',
  'assets/font_6.woff2': 'assets/fonts/work-sans-italic-vietnamese.woff2',
  'assets/font_7.woff2': 'assets/fonts/work-sans-italic-latin-ext.woff2',
  'assets/font_8.woff2': 'assets/fonts/work-sans-italic-latin.woff2',
  'assets/font_9.woff2': 'assets/fonts/work-sans-vietnamese.woff2',
  'assets/font_10.woff2': 'assets/fonts/work-sans-latin-ext.woff2',
  'assets/font_11.woff2': 'assets/fonts/work-sans-latin.woff2',
};
for (const id of ['supreme', 'original', 'frites', 'poutine', 'ailes', 'poulet', 'truffe', 'guac']) {
  RENAMES['assets/tile_' + id + '.png'] = 'assets/img/tile_' + id + '.png';
}

// Names from the ext_resources id map (tile ids, CDN URLs).
const nameByUuid = {};
for (const e of extResources) {
  let id = e.id;
  if (/^https?:\/\//.test(id)) id = path.posix.basename(new URL(id).pathname);
  nameByUuid[e.uuid] = id.replace(/[^\w.-]+/g, '_');
}

fs.mkdirSync(outDir, { recursive: true });
const used = new Set();
const uuidToPath = {};
let counter = 0;
const report = [];

for (const [uuid, entry] of Object.entries(manifest)) {
  let bytes = Buffer.from(entry.data, 'base64');
  if (entry.compressed) bytes = zlib.gunzipSync(bytes);
  if (pageOrder.includes(uuid)) { console.warn('nested page bundle skipped:', uuid); continue; }

  const ext = EXT[entry.mime] || (entry.mime.split('/')[1] || 'bin').replace(/[^a-z0-9]/gi, '');
  let base = nameByUuid[uuid] || entry.mime.split('/')[0] + '_' + (++counter);
  if (!/\.[a-z0-9]{2,5}$/i.test(base)) base += '.' + ext;
  let name = base, n = 2;
  while (used.has(name)) name = base.replace(/(\.[^.]+)$/, '_' + (n++) + '$1');
  used.add(name);

  const isScript = /^(text\/css|text\/javascript|application\/javascript)$/.test(entry.mime);
  let rel = (isScript ? '' : 'assets/') + name;
  if (RENAMES[rel]) rel = RENAMES[rel];
  fs.mkdirSync(path.dirname(path.join(outDir, rel)), { recursive: true });
  fs.writeFileSync(path.join(outDir, rel), bytes);
  uuidToPath[uuid] = rel;
  report.push({ file: rel, mime: entry.mime, kb: (bytes.length / 1024).toFixed(1) });
}

// Replace UUID placeholders with real relative paths.
for (const [uuid, rel] of Object.entries(uuidToPath)) template = template.split(uuid).join(rel);
template = template.replace(/\s+integrity="[^"]*"/gi, '').replace(/\s+crossorigin="[^"]*"/gi, '');

// The runtime reads window.__resources to find local React/ReactDOM and the
// tile images (the original export injected this map at unpack time).
const resourceMap = {};
for (const e of extResources) if (uuidToPath[e.uuid]) resourceMap[e.id] = uuidToPath[e.uuid];
const resourceScript = '\n<script>window.__resources = ' +
  JSON.stringify(resourceMap).replace(/<\//g, '<\\/') + ';</script>';

// Static <title> and lang: the runtime hoists <meta> from the <helmet> block
// but drops <title>, so take the title from the export's own wrapper page.
const outerTitle = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
const headOpen = template.match(/<head[^>]*>/i);
if (headOpen) {
  const i = headOpen.index + headOpen[0].length;
  const titleTag = outerTitle ? '\n<title>' + outerTitle + '</title>' : '';
  template = template.slice(0, i) + titleTag + resourceScript + template.slice(i);
}
template = template.replace(/<html>/i, '<html lang="fr-CA">');

// On GitHub Pages the home page is index.html, not Home.dc.html.
template = template.split('href="Home.dc.html"').join('href="index.html"');

fs.writeFileSync(path.join(outDir, 'index.html'), template, 'utf8');
console.table(report);
const leftover = template.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g);
console.log(leftover ? 'WARNING leftover uuids: ' + leftover.join(', ') : 'OK: no leftover placeholders');
