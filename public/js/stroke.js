/* ONYX — stroke.js
   Scroll-drawn stroke for the statement section (adapted from the React
   Skiper19 svg-follow-scroll). The decorative path draws itself as you scroll
   through the section, tied to scroll progress via a scrubbed ScrollTrigger.
   Reduced motion / no-GSAP: the CSS leaves the stroke fully drawn and static. */
(function () {
  'use strict';

  const section = document.querySelector('.stroke');
  if (!section) return;

  const path = section.querySelector('.stroke__path');
  if (!path) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap =
    typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (reduce || !hasGsap) return; // CSS leaves it drawn

  const gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);

  // pathLength="1" makes the dash unit-based: offset 0.72 -> 0 draws it in.
  gsap.fromTo(
    path,
    { strokeDashoffset: 0.72 },
    {
      strokeDashoffset: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        invalidateOnRefresh: true
      }
    }
  );
})();
