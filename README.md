# Aroma Gourmet — site web

Site vitrine du restaurant **Aroma Gourmet** (1651 rue Ontario Est, Montréal), publié avec GitHub Pages
à l'adresse <https://aromagourmet.ca/> (l'ancienne adresse momo-bar.github.io/aroma redirige).

Site statique : aucun build, aucune dépendance externe. Il suffit de servir le dossier tel quel.

## Pages

| Fichier | Page |
| --- | --- |
| `index.html` | Accueil |
| `menu.html` | Menu |
| `a-propos.html` | À propos |
| `contact.html` | Contact et heures |

## Structure

| Chemin | Rôle |
| --- | --- |
| `js/dc-runtime.js` | Moteur de rendu des gabarits (`<x-dc>`, `<sc-for>`, `<sc-if>`, `{{ … }}`) |
| `js/image-slot.js` | Composant `<image-slot>` (zones d'images) |
| `vendor/` | React 18.3.1 et ReactDOM, servis localement |
| `assets/img/` | Vignettes des plats affichées dans la roue du menu de l'accueil |
| `assets/fonts/` | Polices Big Shoulders Display et Work Sans (woff2), partagées par toutes les pages |
| `assets/site.css` | Ajustements manuels appliqués par-dessus les exports (ex. section masquée) ; lié dans chaque page par l'outil |
| `tools/unpack-bundle.js` | Outil qui reconstruit le site à partir des exports de l'outil de design |
| `tools/patches.js` | Retouches rejouées par l'outil après chaque régénération (photos des burgers, diapositive retirée) |
| `tools/site.config.js` | Coordonnées publiques du restaurant et adresse du site (`siteUrl`), source des métadonnées et des données structurées |
| `tools/seo.js` | Pré-rendu statique des listes, métadonnées dans `<head>`, schema.org, robots.txt, sitemap.xml, llms.txt, 404.html |
| `robots.txt`, `sitemap.xml`, `llms.txt`, `404.html` | Fichiers générés à chaque exécution de l'outil, ne pas modifier à la main |

## Référencement (SEO)

Tout est produit par `tools/seo.js` à partir de `tools/site.config.js` et des données des pages :

- **Contenu lisible sans JavaScript.** Les listes (menu et prix, heures, plats vedettes, avis, valeurs) sont
  pré-rendues en HTML statique à la place des boucles du gabarit. Google, Bing et les robots des plateformes IA
  voient donc le menu complet même sans exécuter le JavaScript. Le moteur de la page affiche ce HTML tel quel.
- **Métadonnées dans `<head>`** : title, description, canonical, Open Graph, Twitter Card, favicons,
  préchargement des polices et de la première photo du héros.
- **Données structurées schema.org** : `Restaurant` (adresse, coordonnées GPS, heures, cuisine, liens de
  commande), `Menu` avec chaque plat et son prix, `WebSite`, page typée et fil d'Ariane.
- **Fichiers racine** : `robots.txt` (robots IA explicitement autorisés), `sitemap.xml`, `llms.txt`
  (résumé pour les assistants IA), `404.html`.

Changer le domaine : modifier `siteUrl` dans `tools/site.config.js`, relancer l'outil, valider et pousser.
Toutes les URL absolues (canonical, sitemap, Open Graph, schema.org, llms.txt) suivent.

Le domaine aromagourmet.ca est enregistré chez GoDaddy ; sa zone DNS (serveurs GoDaddy) contient quatre
enregistrements A `@` vers les adresses de GitHub Pages et un CNAME `www` vers `momo-bar.github.io`. Le fichier
`CNAME` à la racine du dépôt déclare le domaine à GitHub Pages, qui force le HTTPS.

## Mettre à jour le site depuis de nouveaux exports

Les pages sont produites avec un outil de design qui exporte chaque page en un fichier HTML unique
auto-extractible. Pour repartir d'un nouveau dossier d'exports (par exemple
`Downloads/Aroma Gourmet Montreal website/Aroma Gourmet - site`), lancer depuis la racine du dépôt :

```
node tools/unpack-bundle.js "C:/Users/PC/Downloads/Aroma Gourmet Montreal website/Aroma Gourmet - site" .
```

On peut aussi passer un ou plusieurs fichiers d'export au lieu d'un dossier. L'outil réécrit les pages
du même nom ainsi que `assets/`, `js/` et `vendor/` ; il ne supprime pas les fichiers devenus inutiles.

Puis publier :

```
git add -A
git commit -m "Mise à jour du site"
git push
```

GitHub Pages republie automatiquement en une ou deux minutes.

## Modifier le contenu à la main

Tout le texte visible et les données de chaque page se trouvent dans son fichier HTML, dans le HTML
et dans le script `data-dc-script` en bas du fichier. Une modification faite directement dans une page
est perdue à la prochaine régénération : pour qu'elle survive, l'ajouter comme entrée dans
`tools/patches.js` (un texte à trouver, un texte de remplacement), ou pour du style dans `assets/site.css`.

Les photos des burgers (`assets/img/burger-*.jpg`, 1800 px de large) sont branchées sur le héros et les
cartes vedettes de l'accueil par `tools/patches.js`. Le héros tourne sur cinq photos (Suprême, Truffe,
Guacamole, Original, Double) ; la diapositive « Poulet croustillant » attend une photo
(`assets/img/burger-poulet.jpg`, puis rétablir sa ligne dans `tools/patches.js`). Les photos du héros
sont réduites de 15 % par une règle de `assets/site.css`.

- Photos de la roue du menu : remplacer les fichiers dans `assets/img/` en gardant les mêmes noms.
- Autres photos : les `<image-slot>` sans attribut `src` affichent un texte de remplacement.
  Ajouter `src="assets/img/mon-image.jpg"` sur la balise pour afficher une photo.

## Tester en local

```
python -m http.server 8000
```

Puis ouvrir <http://localhost:8000/>.
