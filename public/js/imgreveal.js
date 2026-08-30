/* ONYX — imgreveal.js
   Premium image reveal: the container unmasks upward (clip-path wipe) while the
   image settles from a slight zoom, as it scrolls into view. Runs once per
   element. Falls back to plain images without GSAP / under reduced motion. */
(function () {
  'use strict';

  const items = Array.from(document.querySelectorAll('[data-img-reveal]'));
  if (!items.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap =
    typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  // No GSAP / reduced motion: leave images fully visible.
  if (!hasGsap || reduce) return;

  window.gsap.registerPlugin(window.ScrollTrigger);
  const gsap = window.gsap;

  items.forEach((el) => {
    const img = el.querySelector('img');
    gsap.set(el, { clipPath: 'inset(100% 0 0 0)' });
    if (img) gsap.set(img, { scale: 1.2, transformOrigin: 'center center' });

    window.ScrollTrigger.create({
      trigger: el,
      start: 'top 82%',
      once: true,
      onEnter: () => {
        gsap.to(el, { clipPath: 'inset(0% 0 0 0)', duration: 1.1, ease: 'power3.out' });
        if (img) {
          gsap.to(img, {
            scale: 1,
            duration: 1.4,
            ease: 'power3.out',
            // Hand transform control back to CSS (hover-zoom) once settled.
            onComplete: () => gsap.set(img, { clearProps: 'transform,transformOrigin' })
          });
        }
      }
    });
  });
})();
