/* ONYX — hero.js
   Subtle scroll parallax for the hero key visual: the image scales up gently and
   the whole hero fades as it leaves, so scrolling away feels cinematic. The
   entrance (scale + fade) is handled in CSS via .hero__media.reveal, toggled
   after the preloader by main.js — this only adds the scroll-linked motion.
   Desktop + motion only; otherwise the image just sits still. */
(function () {
  'use strict';

  const hero = document.querySelector('.hero');
  const media = document.querySelector('.hero__media');
  const img = document.querySelector('.hero__img');
  if (!hero || !media || !img) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap =
    typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (reduce || !hasGsap) return;

  const gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);

  // All scroll transforms live on the <img> (which has no other transform); the
  // entrance scale lives on .hero__media, so the two never fight. The image
  // zooms in and lifts gently as the hero scrolls out — cinematic, no jank.
  gsap.to(img, {
    scale: 1.09,
    yPercent: -5,
    ease: 'none',
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: 'bottom top',
      scrub: true
    }
  });
})();
