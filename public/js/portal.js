/* ONYX — portal.js
   Scroll-zoom portal into Our Services (adapted from the GlyphPortal idea, with
   an image instead of type). The section pins and the picture scales up and
   dissolves as you scroll, opening onto the services beneath. Content is
   transform/opacity only, driven by a scrubbed timeline, so it can never get
   stuck. Desktop + motion only; otherwise the CSS leaves a plain full-bleed
   still. */
(function () {
  'use strict';

  const section = document.querySelector('.portal');
  if (!section) return;

  const stage = section.querySelector('.portal__stage');
  const img = section.querySelector('.portal__img');
  if (!stage || !img) return;

  const hasGsap =
    typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (!hasGsap) return; // CSS fallback = static full-bleed image

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const mm = gsap.matchMedia();

  mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
    section.classList.add('is-portal');

    // Zoom the image in; hold it solid through most of the travel, then dissolve
    // in the last stretch so Our Services opens through it.
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
        invalidateOnRefresh: true
      }
    });

    tl.fromTo(img, { scale: 1 }, { scale: 2.6, ease: 'power1.in', duration: 1 }, 0)
      .to(img, { autoAlpha: 0, ease: 'power2.in', duration: 0.32 }, 0.68);

    ScrollTrigger.refresh();

    return () => {
      section.classList.remove('is-portal');
      gsap.set(img, { clearProps: 'all' });
    };
  });
})();
