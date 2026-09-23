# Aroma Gourmet — site web

Site vitrine du restaurant **Aroma Gourmet** (1651 rue Ontario Est, Montréal), publié avec GitHub Pages.

Site statique : aucun build, aucune dépendance externe. Il suffit de servir le dossier tel quel.

## Structure

| Chemin | Rôle |
| --- | --- |
| `index.html` | Page d'accueil (contenu, styles, données du menu et des avis) |
| `js/dc-runtime.js` | Moteur de rendu des gabarits (`<x-dc>`, `<sc-for>`, `<sc-if>`, `{{ … }}`) |
| `js/image-slot.js` | Composant `<image-slot>` (zones d'images) |
| `vendor/` | React 18.3.1 et ReactDOM, servis localement |
| `assets/img/` | Vignettes des plats affichées dans la roue du menu |
| `assets/fonts/` | Polices Big Shoulders Display et Work Sans (woff2) |

## Modifier le contenu

Tout le texte visible et les données se trouvent dans `index.html` :

- Textes, prix et descriptions : dans le HTML et dans le script `data-dc-script` en bas du fichier (`featured`, `reviews`, `items`).
- Photos de la roue du menu : remplacer les fichiers dans `assets/img/` en gardant les mêmes noms.
- Photos du héros et des plats vedettes : les `<image-slot>` sans attribut `src` affichent un texte de remplacement. Ajouter `src="assets/img/mon-image.jpg"` sur la balise pour afficher une photo.

## Pages manquantes

La navigation pointe vers `Menu.dc.html`, `About.dc.html` et `Contact.dc.html`, qui ne font pas encore partie du dépôt. Ajouter ces fichiers à la racine pour activer les liens.

## Tester en local

```
python -m http.server 8000
```

Puis ouvrir <http://localhost:8000/>.
