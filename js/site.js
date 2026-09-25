// Comportements propres au site, chargés sur chaque page par tools/unpack-bundle.js.
// Menu hamburger (petits écrans) : le bouton .ag-burger est inséré dans la barre
// par tools/patches.js et stylé dans assets/site.css ; ce script ouvre et ferme
// le panneau de liens. Les écouteurs sont posés sur le document, donc ils
// fonctionnent quel que soit le moment où le moteur de la page rend la barre.
(function () {
  'use strict';
  var MOBILE_MAX = 760;

  function header() { return document.querySelector('.ag-header'); }
  function isOpen() { var h = header(); return !!(h && h.classList.contains('is-open')); }
  function setOpen(open) {
    var h = header();
    if (!h) return;
    h.classList.toggle('is-open', open);
    var b = h.querySelector('.ag-burger');
    if (b) {
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      b.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    }
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('.ag-burger')) { e.preventDefault(); setOpen(!isOpen()); return; }
    if (!isOpen()) return;
    if (t.closest('.ag-nav-links a')) { setOpen(false); return; }   // lien choisi
    var h = header();
    if (h && !h.contains(t)) setOpen(false);                          // clic à l'extérieur
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) setOpen(false);
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > MOBILE_MAX && isOpen()) setOpen(false);
  });
})();
