// Retouches appliquées par tools/unpack-bundle.js après la régénération d'une
// page depuis un export. Chaque entrée remplace toutes les occurrences de
// `find` par `replace` dans le fichier `file`. Si `find` n'est plus présent
// (l'export a changé), l'outil affiche un avertissement et passe à la suite.
'use strict';

module.exports = [
  // ── Accueil : photos des burgers dans le héros (diapositives plein écran) ──
  {
    file: 'index.html',
    note: 'héros : attribut src sur les diapositives',
    find: '<image-slot id="{{ s.id }}" shape="rect" placeholder="{{ s.placeholder }}"',
    replace: '<image-slot id="{{ s.id }}" shape="rect" src="{{ s.src }}" placeholder="{{ s.placeholder }}"',
  },
  {
    file: 'index.html',
    note: 'héros : photo Burger Suprême',
    find: "{ id: 'hero-supreme', name: 'Suprême', placeholder:",
    replace: "{ id: 'hero-supreme', name: 'Suprême', src: 'assets/img/burger-supreme.jpg', placeholder:",
  },
  {
    file: 'index.html',
    note: 'héros : photo Burger à la truffe',
    find: "{ id: 'hero-truffe', name: 'Truffe', placeholder:",
    replace: "{ id: 'hero-truffe', name: 'Truffe', src: 'assets/img/burger-truffe.jpg', placeholder:",
  },
  {
    file: 'index.html',
    note: 'héros : photo Burger Guacamole',
    find: "{ id: 'hero-guac', name: 'Guacamole', placeholder:",
    replace: "{ id: 'hero-guac', name: 'Guacamole', src: 'assets/img/burger-guacamole.jpg', placeholder:",
  },
  {
    // La diapositive « Poulet croustillant » est remplacée par le burger double
    // tant qu'il n'y a pas de photo du poulet : sans photo, une diapositive vide
    // passerait toutes les 25 secondes. Pour remettre le poulet, rétablir sa
    // ligne ici avec un src vers sa photo.
    file: 'index.html',
    note: 'héros : photo Burger Original, diapositive Poulet remplacée par Burger Double',
    find: "{ id: 'hero-original', name: 'Original', placeholder: 'Photo : Burger Original (plein écran)' },\n    { id: 'hero-poulet', name: 'Poulet croustillant', placeholder: 'Photo : Burger poulet croustillant (plein écran)' }",
    replace: "{ id: 'hero-original', name: 'Original', src: 'assets/img/burger-original.jpg', placeholder: 'Photo : Burger Original (plein écran)' },\n    { id: 'hero-double', name: 'Double', src: 'assets/img/burger-double.jpg', placeholder: 'Photo : Burger Double (plein écran)' }",
  },

  // ── Accueil : photos des trois cartes « Ce que Montréal commande » ──
  {
    file: 'index.html',
    note: 'cartes vedettes : attribut src',
    find: '<image-slot id="{{ f.id }}" shape="rect" placeholder="{{ f.placeholder }}"',
    replace: '<image-slot id="{{ f.id }}" shape="rect" src="{{ f.src }}" placeholder="{{ f.placeholder }}"',
  },
  {
    file: 'index.html',
    note: 'carte : Burger Suprême',
    find: "{ id: 'feat-supreme', name: 'Burger Suprême', price: '13,50 $', placeholder:",
    replace: "{ id: 'feat-supreme', name: 'Burger Suprême', price: '13,50 $', src: 'assets/img/burger-supreme.jpg', placeholder:",
  },
  {
    file: 'index.html',
    note: 'carte : Burger Truffe',
    find: "{ id: 'feat-truffe', name: 'Burger Truffe', price: '14 $', placeholder:",
    replace: "{ id: 'feat-truffe', name: 'Burger Truffe', price: '14 $', src: 'assets/img/burger-truffe.jpg', placeholder:",
  },
  {
    file: 'index.html',
    note: 'carte : Burger Original',
    find: "{ id: 'feat-original', name: 'Burger Original', price: '13,50 $', placeholder:",
    replace: "{ id: 'feat-original', name: 'Burger Original', price: '13,50 $', src: 'assets/img/burger-original.jpg', placeholder:",
  },
];
