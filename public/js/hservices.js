/* ONYX — hservices.js
   Horizontal scroll deck for Our Services: pin the section and slide the panel
   track sideways as the page scrolls (vanilla adaptation of the React
   horizontal-scroll component, driven by the project's GSAP ScrollTrigger).
   Only engages on wider screens with motion allowed; otherwise the CSS leaves
   a normal vertical stack. */
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

  window.gsap.registerPlugin(window.ScrollTrigger);

  // gsap.matchMedia sets up on match and auto-reverts everything created inside
  // when the query stops matching (resize, or motion preference change).
  const mm = window.gsap.matchMedia();

  mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
    section.classList.add('is-hscroll');

    const distance = () => track.scrollWidth - window.innerWidth;

    // Main horizontal slide, pinned.
    const hz = window.gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => '+=' + distance(),
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });

    // Subtle parallax on each panel's image, tied to the horizontal scroll.
    // Move the <img> within its scale(1.12) buffer so edges never show.
    panels.forEach((panel) => {
      const img = panel.querySelector('.hpanel__media img');
      if (!img) return;
      window.gsap.fromTo(
        img,
        { scale: 1.12, xPercent: 5 },
        {
          scale: 1.12,
          xPercent: -5,
          ease: 'none',
          scrollTrigger: {
            trigger: panel,
            containerAnimation: hz,
            start: 'left right',
            end: 'right left',
            scrub: true
          }
        }
      );
    });

    // Cleanup when the query no longer matches.
    return () => {
      section.classList.remove('is-hscroll');
      window.gsap.set(track, { clearProps: 'transform' });
      panels.forEach((panel) => {
        const img = panel.querySelector('.hpanel__media img');
        if (img) window.gsap.set(img, { clearProps: 'transform' });
      });
    };
  });
})();
