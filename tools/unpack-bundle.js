// Rebuild the static site from the design tool's single-file exports.
//
// Each export is a self-extracting HTML file (the "__bundler" format): a JSON
// manifest of base64 assets, a JSON-encoded HTML template with UUID
// placeholders, and an id-to-UUID map that the page reads as window.__resources.
// Several exports share the same fonts, runtime and React under different
// UUIDs, so assets are deduplicated by content and written once.
//
// Usage, from the repository root (inputs may be files or folders of exports):
//   node tools/unpack-bundle.js "C:\path\to\Aroma Gourmet - site" .
//   node tools/unpack-bundle.js export1.html export2.html .
//
// Each export becomes a page with the same file name (index.html, menu.html,
// a-propos.html, contact.html). Existing files with the same names are
// overwritten; files that no longer exist in the exports are not deleted.
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('usage: node tools/unpack-bundle.js <export.html | folder> [...] <outDir>');
  process.exit(1);
}
const outDir = args.pop();
const exportFiles = [];
for (const input of args) {
  if (fs.statSync(input).isDirectory()) {
    for (const f of fs.readdirSync(input).sort()) if (f.endsWith('.html')) exportFiles.push(path.join(input, f));
  } else {
    exportFiles.push(input);
  }
}

function section(html, type) {
  const open = '<script type="__bundler/' + type + '">';
  const i = html.indexOf(open);
  if (i < 0) return null;
  const j = html.indexOf('</script>', i);
  return JSON.parse(html.slice(i + open.length, j));
}
const sha1 = (buf) => crypto.createHash('sha1').update(buf).digest('hex');
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const EXT = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif',
  'image/svg+xml': 'svg', 'video/mp4': 'mp4', 'video/webm': 'webm', 'text/css': 'css',
  'text/javascript': 'js', 'application/javascript': 'js', 'application/json': 'json',
  'font/woff2': 'woff2', 'font/woff': 'woff', 'font/ttf': 'ttf', 'text/html': 'html',
};
// Link targets used by older exports of the same pages.
const LEGACY_LINKS = {
  'Home.dc.html': 'index.html', 'Menu.dc.html': 'menu.html',
  'About.dc.html': 'a-propos.html', 'Contact.dc.html': 'contact.html',
};

// Pass 1: parse every export and collect assets by content hash.
const assets = new Map(); // hash -> { bytes, mime, ids: Set, fontFaces: Set }
const pages = [];
for (const file of exportFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const manifest = section(html, 'manifest');
  const template = section(html, 'template');
  if (!manifest || !template) { console.warn('skipped (not a __bundler export):', file); continue; }
  const ext = section(html, 'ext_resources') || [];
  const pageOrder = section(html, 'page_order') || [];
  const idByUuid = {};
  for (const e of ext) idByUuid[e.uuid] = e.id;

  const uuidToHash = {};
  for (const [uuid, entry] of Object.entries(manifest)) {
    if (pageOrder.includes(uuid)) { console.warn('nested page bundle skipped:', uuid, 'in', file); continue; }
    let bytes = Buffer.from(entry.data, 'base64');
    if (entry.compressed) bytes = zlib.gunzipSync(bytes);
    const hash = sha1(bytes);
    let a = assets.get(hash);
    if (!a) { a = { bytes, mime: entry.mime, ids: new Set(), fontFaces: new Set() }; assets.set(hash, a); }
    if (idByUuid[uuid]) a.ids.add(idByUuid[uuid]);
    if (/^font\//.test(entry.mime)) {
      // "/* latin */ @font-face { font-family: 'X'; font-style: italic; ... src: url("uuid") }"
      for (const m of template.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g)) {
        if (!m[2].includes(uuid)) continue;
        const family = (m[2].match(/font-family:\s*['"]([^'"]+)['"]/) || [])[1];
        const style = (m[2].match(/font-style:\s*(\w+)/) || [])[1];
        if (family) a.fontFaces.add(JSON.stringify({ family, style, subset: m[1] }));
      }
    }
    uuidToHash[uuid] = hash;
  }
  const outerTitle = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
  pages.push({ name: path.basename(file), template, ext, uuidToHash, outerTitle });
}
if (!pages.length) { console.error('No exports found.'); process.exit(1); }

// Pass 2: give every asset a descriptive path and write it once.
const usedPaths = new Set();
function unique(rel) {
  let out = rel, n = 2;
  while (usedPaths.has(out)) out = rel.replace(/(\.[^.]+)$/, '-' + (n++) + '$1');
  usedPaths.add(out);
  return out;
}
const pathByHash = new Map();
const report = [];
let scriptN = 0, otherN = 0;
for (const [hash, a] of assets) {
  const ext = EXT[a.mime] || (a.mime.split('/')[1] || 'bin').replace(/[^a-z0-9]/gi, '');
  const ids = [...a.ids];
  const urlId = ids.find((id) => /^https?:\/\//.test(id));
  const plainId = ids.find((id) => !/^https?:\/\//.test(id));
  let rel;
  if (/javascript$/.test(a.mime)) {
    const head = a.bytes.subarray(0, 600).toString('utf8');
    if (urlId) rel = 'vendor/' + path.posix.basename(new URL(urlId).pathname);
    else if (/dc-runtime/.test(head)) rel = 'js/dc-runtime.js';
    else if (/<image-slot>/.test(head)) rel = 'js/image-slot.js';
    else rel = 'js/script-' + (++scriptN) + '.js';
  } else if (/^font\//.test(a.mime) && a.fontFaces.size) {
    const f = JSON.parse([...a.fontFaces][0]);
    const style = f.style && f.style !== 'normal' ? '-' + f.style : '';
    rel = 'assets/fonts/' + slug(f.family) + style + '-' + slug(f.subset) + '.' + ext;
  } else if (plainId) {
    const base = plainId.replace(/[^\w.-]+/g, '_') + (/\.\w{2,5}$/.test(plainId) ? '' : '.' + ext);
    rel = (/^image\//.test(a.mime) ? 'assets/img/' : 'assets/') + base;
  } else {
    rel = 'assets/' + a.mime.split('/')[0] + '-' + (++otherN) + '.' + ext;
  }
  rel = unique(rel);
  fs.mkdirSync(path.dirname(path.join(outDir, rel)), { recursive: true });
  fs.writeFileSync(path.join(outDir, rel), a.bytes);
  pathByHash.set(hash, rel);
  report.push({ file: rel, mime: a.mime, kb: (a.bytes.length / 1024).toFixed(1) });
}

// Pass 3: write each page with real paths.
for (const p of pages) {
  let t = p.template;
  for (const [uuid, hash] of Object.entries(p.uuidToHash)) t = t.split(uuid).join(pathByHash.get(hash));
  t = t.replace(/\s+integrity="[^"]*"/gi, '').replace(/\s+crossorigin="[^"]*"/gi, '');

  // The runtime reads window.__resources to find local React/ReactDOM and the
  // named images (the original export injected this map at unpack time).
  const resourceMap = {};
  for (const e of p.ext) {
    const h = p.uuidToHash[e.uuid];
    if (h) resourceMap[e.id] = pathByHash.get(h);
  }
  const resourceScript = '\n<script>window.__resources = ' +
    JSON.stringify(resourceMap).replace(/<\//g, '<\\/') + ';</script>';

  // Static <title> and lang: the runtime hoists <meta> from the <helmet> block
  // but drops <title>, so take the title from the export's own wrapper page.
  const headOpen = t.match(/<head[^>]*>/i);
  if (headOpen) {
    const i = headOpen.index + headOpen[0].length;
    const titleTag = p.outerTitle ? '\n<title>' + p.outerTitle + '</title>' : '';
    t = t.slice(0, i) + titleTag + resourceScript + t.slice(i);
  }
  t = t.replace(/<html>/i, '<html lang="fr-CA">');
  for (const [from, to] of Object.entries(LEGACY_LINKS)) t = t.split('href="' + from + '"').join('href="' + to + '"');

  fs.writeFileSync(path.join(outDir, p.name), t, 'utf8');
  const leftover = t.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g);
  console.log(p.name.padEnd(16), (t.length / 1024).toFixed(1) + ' kb', leftover ? 'WARNING leftover uuids: ' + leftover.join(', ') : 'OK');
}
console.table(report);
