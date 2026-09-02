/* ONYX — bento.js
   Staggered blur-up reveal for the testimonials bento (adapted from the React
   TimelineContent variants). Arms the initial hidden state only when JS runs,
   then reveals on scroll — so without JS / under reduced motion the cards stay
   plainly visible. */
(function () {
  'use strict';

  const section = document.querySelector('[data-bento]');
  if (!section) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Reduced motion: leave cards visible, no animation.
  if (reduce) return;

  // Arm the hidden initial state (CSS reacts to .is-armed).
  section.classList.add('is-armed');

  const reveal = () => section.classList.add('is-in');

  const hasST = typeof window.ScrollTrigger !== 'undefined';
  if (hasST) {
    window.ScrollTrigger.create({ trigger: section, start: 'top 78%', once: true, onEnter: reveal });
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          reveal();
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(section);
  } else {
    reveal();
  }
})();
