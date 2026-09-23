# Aroma Gourmet — site web

Site vitrine du restaurant **Aroma Gourmet** (1651 rue Ontario Est, Montréal), publié avec GitHub Pages
à l'adresse <https://momo-bar.github.io/aroma/>.

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
| `tools/unpack-bundle.js` | Outil qui reconstruit le site à partir des exports de l'outil de design |

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
et dans le script `data-dc-script` en bas du fichier.

- Photos de la roue du menu : remplacer les fichiers dans `assets/img/` en gardant les mêmes noms.
- Autres photos : les `<image-slot>` sans attribut `src` affichent un texte de remplacement.
  Ajouter `src="assets/img/mon-image.jpg"` sur la balise pour afficher une photo.

## Tester en local

```
python -m http.server 8000
```

Puis ouvrir <http://localhost:8000/>.
