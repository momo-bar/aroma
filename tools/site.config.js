// Informations publiques du restaurant et réglages du site, utilisés par
// tools/seo.js pour produire les métadonnées, les données structurées,
// robots.txt, sitemap.xml, llms.txt et la page 404.
'use strict';

module.exports = {
  // Adresse publique du site, avec la barre oblique finale. À passer à
  // 'https://aromagourmet.ca/' le jour où le domaine pointera vers GitHub
  // Pages, puis relancer l'outil : canonical, sitemap, Open Graph et données
  // structurées suivent automatiquement.
  siteUrl: 'https://momo-bar.github.io/aroma/',

  name: 'Aroma Gourmet',
  description:
    'Aroma Gourmet est un restaurant fast-food gourmet halal du Village à Montréal (1651 rue Ontario Est, métro Papineau) : ' +
    'burgers maison, poutines à la sauce maison, ailes de poulet, sandwichs sur pain maison et salades. ' +
    'Salle à manger, comptoir, commandes pour emporter et livraison par Uber Eats et DoorDash.',
  telephone: '+1-438-531-6482',
  telephoneDisplay: '(438) 531-6482',
  priceRange: '$',
  servesCuisine: ['Burgers', 'Poutine', 'Ailes de poulet', 'Sandwichs', 'Salades', 'Fast food gourmet', 'Halal'],
  address: {
    streetAddress: '1651 rue Ontario Est',
    addressLocality: 'Montréal',
    addressRegion: 'QC',
    postalCode: 'H2L 1S8',
    addressCountry: 'CA',
  },
  neighbourhood: 'Le Village',
  geo: { latitude: 45.5218, longitude: -73.5567 },
  // Heures d'ouverture (format schema.org) ; garder en phase avec contact.html.
  openingHours: [
    { days: ['Monday'], opens: '17:00', closes: '22:00' },
    { days: ['Tuesday', 'Wednesday', 'Thursday', 'Sunday'], opens: '11:00', closes: '22:00' },
    { days: ['Friday', 'Saturday'], opens: '11:00', closes: '23:00' },
  ],
  openingHoursText: 'Lundi 17 h – 22 h · Mardi à jeudi 11 h – 22 h · Vendredi et samedi 11 h – 23 h · Dimanche 11 h – 22 h',
  orderLinks: {
    'Uber Eats': 'https://www.order.store/store/aroma-gourmet/RjftZDDYXX-YyPR5PmC5Vw',
    DoorDash: 'https://www.doordash.com/store/aroma-gourmet-26313376',
  },
  instagram: 'https://www.instagram.com/aromagourmet_officiel/',
  mapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=1651+Rue+Ontario+Est,+Montréal,+QC+H2L+1S8',

  // Images (chemins relatifs à la racine du site).
  ogImage: { path: 'assets/img/og.jpg', width: 1200, height: 630, alt: 'Burger Suprême d’Aroma Gourmet, Montréal' },
  logo: 'assets/img/logo-aroma.png',
  photos: [
    'assets/img/burger-supreme.jpg', 'assets/img/burger-truffe.jpg', 'assets/img/burger-guacamole.jpg',
    'assets/img/burger-original.jpg', 'assets/img/burger-double.jpg',
  ],
  icons: { ico: 'favicon.ico', png96: 'assets/icons/favicon-96.png', apple: 'assets/icons/apple-touch-icon.png', png192: 'assets/icons/favicon-192.png' },
  preloadFonts: ['assets/fonts/big-shoulders-display-latin.woff2', 'assets/fonts/work-sans-latin.woff2'],
  themeColor: '#15120f',
  locale: 'fr_CA',
  language: 'fr-CA',

  // Par page : type schema.org, listes de données à pré-rendre en HTML statique
  // (visibles sans JavaScript), image à précharger, fil d'Ariane.
  pages: {
    'index.html': { type: 'WebPage', label: 'Accueil', staticLists: ['featured', 'reviews'], preloadImage: 'assets/img/burger-supreme.jpg' },
    'menu.html': { type: 'WebPage', label: 'Menu', staticLists: ['sections'], menu: true },
    'a-propos.html': { type: 'AboutPage', label: 'À propos', staticLists: ['values'] },
    'contact.html': { type: 'ContactPage', label: 'Contact et heures', staticLists: ['hours'] },
  },
};
