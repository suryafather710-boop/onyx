/* ONYX — hproc.js
   Horizontal feature reveal for Our Process (adapted from the React
   HorizontalFeatureReveal). On wide screens the stage pins and the row of
   process cards scrubs sideways as you scroll, with a gentle parallax on each
   card's big step number. Content stays visible throughout (transform-only), so
   nothing can be left hidden. Uses the project's GSAP ScrollTrigger — no paid
   SplitText. Engages only with motion allowed on wide screens; otherwise the CSS
   leaves a readable vertical stack. */
(function () {
  'use strict';

  const section = document.querySelector('.hproc');
  if (!section) return;

  const track = section.querySelector('.hproc__track');
  const cards = Array.from(section.querySelectorAll('.hproc__card'));
  if (!track || cards.length < 2) return;

  const hasGsap =
    typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (!hasGsap) return; // CSS fallback = vertical stack

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const mm = gsap.matchMedia();

  mm.add('(min-width: 1026px) and (prefers-reduced-motion: no-preference)', () => {
    section.classList.add('is-hscroll');

    const distance = () => Math.max(1, track.scrollWidth - window.innerWidth);

    // Pinned horizontal slide. scrub:1 gives a smooth catch-up feel.
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

    // Parallax the big step number within its panel, tied to the horizontal
    // motion — always in sync, never leaves a blank.
    cards.forEach((card) => {
      const num = card.querySelector('[data-hproc-num]');
      if (!num) return;
      gsap.fromTo(
        num,
        { xPercent: 18 },
        {
          xPercent: -18,
          ease: 'none',
          scrollTrigger: {
            trigger: card,
            containerAnimation: hz,
            start: 'left right',
            end: 'right left',
            scrub: true,
            invalidateOnRefresh: true
          }
        }
      );
    });

    ScrollTrigger.refresh();

    return () => {
      section.classList.remove('is-hscroll');
      gsap.set(track, { clearProps: 'transform' });
      cards.forEach((card) => {
        const num = card.querySelector('[data-hproc-num]');
        if (num) gsap.set(num, { clearProps: 'transform' });
      });
    };
  });
})();
