// SEO : rend les pages lisibles par les robots qui n'exécutent pas JavaScript
// (Google, Bing et la plupart des robots des plateformes IA lisent le HTML brut).
//
//  - Les listes de données (menu et prix, heures, avis, plats vedettes) sont
//    pré-rendues en HTML statique à la place des boucles <sc-for> ; le moteur
//    de la page les affiche ensuite tel quel.
//  - Les métadonnées (title, description, Open Graph, canonical, favicons,
//    préchargements) sont écrites dans <head> au lieu du bloc <helmet> du corps.
//  - Des données structurées schema.org (Restaurant, Menu, pages) sont
//    générées depuis tools/site.config.js et les données des pages.
//  - robots.txt, sitemap.xml, llms.txt et 404.html sont produits à la racine.
'use strict';
const fs = require('fs');
const path = require('path');

const escapeHtml = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const decodeHtml = (s) => String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#8217;/g, '’').replace(/&nbsp;/g, ' ');
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pageUrl = (name, cfg) => (name === 'index.html' ? cfg.siteUrl : cfg.siteUrl + name);
const abs = (rel, cfg) => cfg.siteUrl + rel;

// ── Données de la page : évalue le script <x-dc> avec des doublures ──────────
function extractVals(html) {
  const m = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    class DCLogic { constructor() { this.props = {}; this.state = {}; } setState() {} }
    const React = { createRef: () => ({ current: null }) };
    const win = { __resources: {}, innerHeight: 900, innerWidth: 1440, scrollY: 0, addEventListener() {}, removeEventListener() {} };
    const noop = () => 0;
    const Component = new Function('DCLogic', 'React', 'window', 'document', 'requestAnimationFrame', 'setInterval', 'clearInterval', 'fetch',
      m[1] + '\nreturn Component;')(DCLogic, React, win, {}, noop, noop, noop, () => Promise.reject());
    return new Component().renderVals();
  } catch (e) {
    console.warn('WARNING SEO: page data could not be evaluated (' + e.message + ')');
    return null;
  }
}

// ── Pré-rendu des boucles <sc-for> ─────────────────────────────────────────────
function findLoop(t, listExpr, from) {
  const open = new RegExp('<sc-for list="\\{\\{ ' + escapeRe(listExpr) + ' \\}\\}" as="(\\w+)"[^>]*>', 'g');
  open.lastIndex = from;
  const m = open.exec(t);
  if (!m) return null;
  const tokens = /<sc-for\b[^>]*>|<\/sc-for>/g;
  tokens.lastIndex = m.index + m[0].length;
  let depth = 1, tok;
  while ((tok = tokens.exec(t))) {
    if (tok[0][1] === '/') { depth--; if (depth === 0) return { start: m.index, innerStart: m.index + m[0].length, innerEnd: tok.index, end: tok.index + tok[0].length, alias: m[1] }; }
    else depth++;
  }
  return null;
}
function lookup(obj, pathExpr) {
  let v = obj;
  for (const k of pathExpr.split('.')) { if (v == null) return ''; v = v[k]; }
  return v == null || typeof v === 'function' || typeof v === 'object' ? '' : v;
}
function renderItem(inner, alias, item) {
  let s = inner;
  const nested = new RegExp('<sc-for list="\\{\\{ ' + alias + '\\.(\\w+) \\}\\}"');
  for (let guard = 0; guard < 20; guard++) {
    const nm = nested.exec(s);
    if (!nm) break;
    const next = expandList(s, alias + '.' + nm[1], item[nm[1]]);
    if (next === s) break;
    s = next;
  }
  return s.replace(new RegExp('\\{\\{\\s*' + alias + '\\.([\\w.]+)\\s*\\}\\}', 'g'), (_, p) => escapeHtml(lookup(item, p)));
}
function expandList(t, listExpr, data) {
  if (!Array.isArray(data)) return t;
  let pos = 0, loop;
  while ((loop = findLoop(t, listExpr, pos))) {
    const inner = t.slice(loop.innerStart, loop.innerEnd);
    const out = data.map((item) => renderItem(inner, loop.alias, item)).join('');
    t = t.slice(0, loop.start) + out + t.slice(loop.end);
    pos = loop.start + out.length;
  }
  return t;
}

// ── Métadonnées du bloc <helmet> ───────────────────────────────────────────────
function extractHelmet(t) {
  const out = { title: '', metas: [], html: t };
  const hm = t.match(/<helmet>([\s\S]*?)<\/helmet>/);
  if (!hm) return out;
  let inner = hm[1];
  const tm = inner.match(/<title>([\s\S]*?)<\/title>\s*/);
  if (tm) { out.title = tm[1].trim(); inner = inner.replace(tm[0], ''); }
  inner = inner.replace(/<meta\b[^>]*>\s*/g, (tag) => {
    const attrs = {};
    for (const a of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    out.metas.push(attrs);
    return '';
  });
  inner = inner.replace(/<link\b[^>]*>\s*/g, '');                                   // preconnect Google Fonts : inutile, polices locales
  inner = inner.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, ''); // remplacé par les données générées
  out.html = t.replace(hm[0], '<helmet>' + inner + '</helmet>');
  return out;
}
const metaValue = (metas, key) => { const m = metas.find((x) => x.name === key || x.property === key); return m ? m.content : ''; };

// ── Données structurées ───────────────────────────────────────────────────────
const parsePrice = (s) => { const n = parseFloat(String(s).replace(/[^\d,.]/g, '').replace(',', '.')); return Number.isFinite(n) ? n.toFixed(2) : undefined; };

function restaurantNode(cfg) {
  return {
    '@type': 'Restaurant',
    '@id': cfg.siteUrl + '#restaurant',
    name: cfg.name,
    url: cfg.siteUrl,
    description: cfg.description,
    image: [abs(cfg.ogImage.path, cfg), ...cfg.photos.map((p) => abs(p, cfg))],
    logo: abs(cfg.logo, cfg),
    telephone: cfg.telephone,
    priceRange: cfg.priceRange,
    servesCuisine: cfg.servesCuisine,
    address: { '@type': 'PostalAddress', ...cfg.address },
    geo: { '@type': 'GeoCoordinates', ...cfg.geo },
    areaServed: { '@type': 'City', name: cfg.address.addressLocality },
    openingHoursSpecification: cfg.openingHours.map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: h.days, opens: h.opens, closes: h.closes })),
    hasMenu: { '@id': cfg.siteUrl + 'menu.html#menu' },
    acceptsReservations: false,
    currenciesAccepted: 'CAD',
    hasMap: cfg.mapsUrl,
    sameAs: [cfg.instagram, ...Object.values(cfg.orderLinks)],
    potentialAction: Object.entries(cfg.orderLinks).map(([label, url]) => ({
      '@type': 'OrderAction',
      name: 'Commander sur ' + label,
      target: { '@type': 'EntryPoint', urlTemplate: url, inLanguage: cfg.language, actionPlatform: ['https://schema.org/DesktopWebPlatform', 'https://schema.org/MobileWebPlatform'] },
    })),
  };
}
function menuNode(cfg, sections) {
  const url = cfg.siteUrl + 'menu.html';
  return {
    '@type': 'Menu',
    '@id': url + '#menu',
    name: 'Menu ' + cfg.name,
    url,
    inLanguage: cfg.language,
    hasMenuSection: sections.map((s) => ({
      '@type': 'MenuSection',
      name: s.title,
      description: s.note || undefined,
      hasMenuItem: (s.items || []).map((it) => ({
        '@type': 'MenuItem',
        name: it.name,
        description: it.desc || undefined,
        suitableForDiet: 'https://schema.org/HalalDiet',
        offers: { '@type': 'Offer', price: parsePrice(it.price), priceCurrency: 'CAD', availability: 'https://schema.org/InStock' },
      })),
    })),
  };
}
function jsonLd(name, cfg, pageCfg, title, description, vals) {
  const url = pageUrl(name, cfg);
  const graph = [
    restaurantNode(cfg),
    { '@type': 'WebSite', '@id': cfg.siteUrl + '#website', url: cfg.siteUrl, name: cfg.name, inLanguage: cfg.language, publisher: { '@id': cfg.siteUrl + '#restaurant' } },
    {
      '@type': pageCfg.type || 'WebPage', '@id': url, url, name: title, description, inLanguage: cfg.language,
      isPartOf: { '@id': cfg.siteUrl + '#website' }, about: { '@id': cfg.siteUrl + '#restaurant' },
      primaryImageOfPage: { '@type': 'ImageObject', url: abs(cfg.ogImage.path, cfg), width: cfg.ogImage.width, height: cfg.ogImage.height },
    },
  ];
  if (name !== 'index.html') {
    graph.push({
      '@type': 'BreadcrumbList', '@id': url + '#breadcrumb',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: cfg.pages['index.html'].label, item: cfg.siteUrl },
        { '@type': 'ListItem', position: 2, name: pageCfg.label || title, item: url },
      ],
    });
  }
  if (pageCfg.menu && vals && Array.isArray(vals.sections)) graph.push(menuNode(cfg, vals.sections));
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 1).replace(/<\//g, '<\\/');
}

// ── En-tête ───────────────────────────────────────────────────────────────────
function buildHead({ name, cfg, pageCfg, helmet, vals, fallbackTitle }) {
  const url = pageUrl(name, cfg);
  const title = helmet.title || fallbackTitle || cfg.name;
  const description = metaValue(helmet.metas, 'description') || escapeHtml(cfg.description);
  const ogTitle = metaValue(helmet.metas, 'og:title') || title;
  const ogDescription = metaValue(helmet.metas, 'og:description') || description;
  const keywords = metaValue(helmet.metas, 'keywords');
  const ogImage = abs(cfg.ogImage.path, cfg);
  const L = [];
  L.push('<title>' + title + '</title>');
  L.push('<meta name="description" content="' + description + '">');
  if (keywords) L.push('<meta name="keywords" content="' + keywords + '">');
  L.push('<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">');
  L.push('<link rel="canonical" href="' + url + '">');
  L.push('<meta name="theme-color" content="' + cfg.themeColor + '">');
  L.push('<meta property="og:type" content="website">');
  L.push('<meta property="og:site_name" content="' + escapeHtml(cfg.name) + '">');
  L.push('<meta property="og:locale" content="' + cfg.locale + '">');
  L.push('<meta property="og:url" content="' + url + '">');
  L.push('<meta property="og:title" content="' + ogTitle + '">');
  L.push('<meta property="og:description" content="' + ogDescription + '">');
  L.push('<meta property="og:image" content="' + ogImage + '">');
  L.push('<meta property="og:image:width" content="' + cfg.ogImage.width + '">');
  L.push('<meta property="og:image:height" content="' + cfg.ogImage.height + '">');
  L.push('<meta property="og:image:alt" content="' + escapeHtml(cfg.ogImage.alt) + '">');
  L.push('<meta name="twitter:card" content="summary_large_image">');
  L.push('<meta name="twitter:title" content="' + ogTitle + '">');
  L.push('<meta name="twitter:description" content="' + ogDescription + '">');
  L.push('<meta name="twitter:image" content="' + ogImage + '">');
  L.push('<link rel="icon" href="' + cfg.icons.ico + '" sizes="32x32">');
  L.push('<link rel="icon" type="image/png" sizes="96x96" href="' + cfg.icons.png96 + '">');
  L.push('<link rel="icon" type="image/png" sizes="192x192" href="' + cfg.icons.png192 + '">');
  L.push('<link rel="apple-touch-icon" sizes="180x180" href="' + cfg.icons.apple + '">');
  for (const f of cfg.preloadFonts) L.push('<link rel="preload" as="font" type="font/woff2" crossorigin href="' + f + '">');
  if (pageCfg.preloadImage) L.push('<link rel="preload" as="image" href="' + pageCfg.preloadImage + '" fetchpriority="high">');
  L.push('<script type="application/ld+json">\n' + jsonLd(name, cfg, pageCfg, decodeHtml(title), decodeHtml(description), vals) + '\n</script>');
  return { block: L.join('\n'), title, description };
}

// Page complète : pré-rendu, métadonnées, en-tête.
function preparePage({ name, html, cfg, headExtras, fallbackTitle }) {
  const pageCfg = cfg.pages[name] || {};
  const vals = extractVals(html);
  let t = html;
  if (vals) for (const list of pageCfg.staticLists || []) t = expandList(t, list, vals[list]);
  const helmet = extractHelmet(t);
  t = helmet.html;
  const head = buildHead({ name, cfg, pageCfg, helmet, vals, fallbackTitle });
  // L'en-tête du gabarit ne garde que le script du moteur ; charset et viewport
  // sont réémis en tête, suivis du bloc SEO puis des extras (site.css, ressources).
  t = t.replace(/<meta charset="utf-8">\s*/i, '').replace(/<meta name="viewport"[^>]*>\s*/i, '');
  const headOpen = t.match(/<head[^>]*>/i);
  if (headOpen) {
    const i = headOpen.index + headOpen[0].length;
    t = t.slice(0, i) + '\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' + head.block + (headExtras || '') + '\n' + t.slice(i);
  }
  t = t.split('href="index.html"').join('href="./"'); // même URL que la canonical de l'accueil
  return { html: t, vals, title: decodeHtml(head.title), description: decodeHtml(head.description), url: pageUrl(name, cfg), label: pageCfg.label || decodeHtml(head.title) };
}

// ── Fichiers racine : robots.txt, sitemap.xml, llms.txt, 404.html ─────────────
function writeSiteFiles(outDir, cfg, pageInfos) {
  const today = new Date().toISOString().slice(0, 10);
  const order = Object.keys(cfg.pages).filter((n) => pageInfos.has(n));

  fs.writeFileSync(path.join(outDir, 'robots.txt'), [
    '# ' + cfg.name + ' — tout le site est ouvert aux moteurs de recherche et aux robots des plateformes IA.',
    'User-agent: *',
    'Allow: /',
    '',
    '# Robots IA (recherche et assistants) explicitement bienvenus',
    ...['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User',
      'Google-Extended', 'Googlebot', 'Bingbot', 'Applebot', 'Applebot-Extended', 'DuckAssistBot', 'CCBot', 'Amazonbot', 'meta-externalagent', 'YouBot', 'cohere-ai', 'Bytespider']
      .flatMap((ua) => ['User-agent: ' + ua, 'Allow: /']),
    '',
    'Sitemap: ' + cfg.siteUrl + 'sitemap.xml',
    '',
  ].join('\n'));

  fs.writeFileSync(path.join(outDir, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
    order.map((n, k) => {
      const info = pageInfos.get(n);
      const images = n === 'index.html' ? cfg.photos.map((p) => '    <image:image><image:loc>' + abs(p, cfg) + '</image:loc></image:image>').join('\n') + '\n' : '';
      return '  <url>\n    <loc>' + info.url + '</loc>\n    <lastmod>' + today + '</lastmod>\n    <changefreq>' + (k === 0 ? 'weekly' : 'monthly') + '</changefreq>\n    <priority>' + (k === 0 ? '1.0' : n === 'menu.html' ? '0.9' : '0.7') + '</priority>\n' + images + '  </url>';
    }).join('\n') + '\n</urlset>\n');

  const menu = pageInfos.get('menu.html');
  const sections = menu && menu.vals && Array.isArray(menu.vals.sections) ? menu.vals.sections : [];
  const a = cfg.address;
  fs.writeFileSync(path.join(outDir, 'llms.txt'), [
    '# ' + cfg.name,
    '',
    '> ' + cfg.description,
    '',
    '- Adresse : ' + a.streetAddress + ', ' + a.addressLocality + ' (Québec) ' + a.postalCode + ', Canada — ' + cfg.neighbourhood + ', métro Papineau',
    '- Téléphone : ' + cfg.telephoneDisplay,
    '- Heures d’ouverture : ' + cfg.openingHoursText,
    '- Viande 100 % halal. Prix en dollars canadiens, taxes en sus. Pas de réservation.',
    '- Commander en ligne : ' + Object.entries(cfg.orderLinks).map(([l, u]) => l + ' ' + u).join(' · '),
    '- Instagram : ' + cfg.instagram,
    '- Itinéraire : ' + cfg.mapsUrl,
    '',
    '## Pages',
    '',
    ...order.map((n) => { const i = pageInfos.get(n); return '- [' + i.label + '](' + i.url + ') : ' + i.description; }),
    '',
    '## Menu (prix en CAD)',
    '',
    ...sections.flatMap((s) => [
      '### ' + s.title + (s.note ? ' — ' + s.note : ''),
      '',
      ...(s.items || []).map((it) => '- ' + it.name + ' — ' + it.price + (it.desc ? ' : ' + it.desc : '')),
      '',
    ]),
  ].join('\n'));

  const base = new URL(cfg.siteUrl).pathname;
  fs.writeFileSync(path.join(outDir, '404.html'), `<!DOCTYPE html>
<html lang="${cfg.language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page introuvable — ${escapeHtml(cfg.name)}</title>
<meta name="robots" content="noindex, follow">
<link rel="icon" href="${base}${cfg.icons.ico}" sizes="32x32">
<link rel="icon" type="image/png" sizes="96x96" href="${base}${cfg.icons.png96}">
<style>
@font-face{font-family:'Big Shoulders Display';font-weight:900;font-display:swap;src:url("${base}assets/fonts/big-shoulders-display-latin.woff2") format('woff2')}
@font-face{font-family:'Work Sans';font-weight:400;font-display:swap;src:url("${base}assets/fonts/work-sans-latin.woff2") format('woff2')}
html,body{margin:0;background:${cfg.themeColor};color:#f4ecdc;font-family:'Work Sans',system-ui,sans-serif}
main{min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:20px;max-width:1280px;margin:0 auto;padding:48px 24px;box-sizing:border-box}
.brand,h1,.btn{font-family:'Big Shoulders Display',sans-serif;text-transform:uppercase;line-height:1}
.brand{font-weight:900;font-size:34px;color:#f4ecdc;text-decoration:none}.brand span{color:#d8361f}
h1{margin:16px 0 0;font-weight:900;font-size:clamp(56px,10vw,140px);letter-spacing:.01em}h1 span{color:#d8361f}
p{margin:0;font-size:18px;line-height:1.6;color:#c9bfae;max-width:56ch}
nav{display:flex;gap:12px;flex-wrap:wrap;margin-top:8px}
.btn{display:inline-block;padding:14px 24px;border-radius:4px;font-weight:800;font-size:20px;letter-spacing:.08em;text-decoration:none;background:#d8361f;color:#fff}
.btn.alt{background:transparent;color:#f4ecdc;border:2px solid #f4ecdc}
</style>
</head>
<body>
<main>
<a class="brand" href="${base}">Aroma<span>Gourmet</span></a>
<h1>Page <span>introuvable</span></h1>
<p>Cette adresse n’existe pas ou plus. Le menu, les heures et l’adresse du restaurant sont à un clic.</p>
<nav>
${order.map((n, k) => '<a class="btn' + (k ? ' alt' : '') + '" href="' + base + (n === 'index.html' ? '' : n) + '">' + escapeHtml(pageInfos.get(n).label) + '</a>').join('\n')}
</nav>
</main>
</body>
</html>
`);
  return ['robots.txt', 'sitemap.xml', 'llms.txt', '404.html'];
}

module.exports = { preparePage, writeSiteFiles, extractVals };
