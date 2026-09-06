/* ONYX — hservices.js
   Horizontal feature deck for Our Services: pin the section and slide the panel
   track sideways as the page scrolls, with an image parallax tied to the
   horizontal motion. Content stays visible throughout (no opacity reveals) so
   the scroll is smooth and nothing can ever be left hidden. Vanilla + the
   project's GSAP ScrollTrigger. Engages only on wider screens with motion
   allowed; otherwise the CSS leaves a normal vertical stack. */
(function () {
  'use strict';

  const section = document.querySelector('.hservices');
  if (!section) return;

  const track = section.querySelector('.hservices__track');
  const panels = Array.from(section.querySelectorAll('.hpanel'));
  if (!track || panels.length < 2) return;

  const hasGsap =
    typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (!hasGsap) return; // CSS fallback = vertical stack

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  // Don't let mobile browser-chrome resize thrash the pin (a common jitter source).
  ScrollTrigger.config({ ignoreMobileResize: true });

  // gsap.matchMedia sets up on match and auto-reverts everything created inside
  // when the query stops matching (resize, or motion preference change).
  const mm = gsap.matchMedia();

  mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
    section.classList.add('is-hscroll');

    const distance = () => Math.max(1, track.scrollWidth - window.innerWidth);

    // Main horizontal slide, pinned. scrub:1 gives a smooth catch-up feel.
    const hz = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => '+=' + distance(),
        pin: true,
        pinSpacing: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });

    // Image parallax within its scale buffer (edges never show). Transform-only,
    // tied to the horizontal scroll — always in sync, never leaves a blank.
    panels.forEach((panel) => {
      const img = panel.querySelector('.hpanel__media img');
      if (!img) return;
      gsap.fromTo(
        img,
        { scale: 1.2, xPercent: 8 },
        {
          scale: 1.2,
          xPercent: -8,
          ease: 'none',
          scrollTrigger: {
            trigger: panel,
            containerAnimation: hz,
            start: 'left right',
            end: 'right left',
            scrub: true,
            invalidateOnRefresh: true
          }
        }
      );
    });

    // Recompute once fonts/layout settle.
    ScrollTrigger.refresh();

    // Cleanup when the query no longer matches.
    return () => {
      section.classList.remove('is-hscroll');
      gsap.set(track, { clearProps: 'transform' });
      panels.forEach((panel) => {
        const img = panel.querySelector('.hpanel__media img');
        if (img) gsap.set(img, { clearProps: 'transform' });
      });
    };
  });
})();
