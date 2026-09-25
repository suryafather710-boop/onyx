/* ONYX — reveal-text.js
   Byotōne-style scroll-triggered text reveal. Any element marked
   data-split="words" has its words wrapped in an overflow-hidden mask; on
   scroll into view each word rises from below and fades in, with a stagger.
   Uses GSAP + ScrollTrigger when present (already loaded on the page); falls
   back to showing the text immediately when GSAP is missing or the visitor
   prefers reduced motion. Purely presentational — the text is real text, so
   it stays selectable and accessible. */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function splitWords(el) {
    // Preserve any inline markup by only splitting top-level text nodes.
    const words = el.textContent.replace(/\s+/g, ' ').trim().split(' ');
    el.textContent = '';
    el.classList.add('rt');
    const spans = [];
    words.forEach((word, i) => {
      const mask = document.createElement('span');
      mask.className = 'rt-mask';
      const inner = document.createElement('span');
      inner.className = 'rt-word';
      inner.textContent = word;
      mask.appendChild(inner);
      el.appendChild(mask);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      spans.push(inner);
    });
    return spans;
  }

  function boot() {
    const targets = Array.prototype.slice.call(document.querySelectorAll('[data-split="words"]'));
    if (!targets.length) return;

    const hasGsap =
      typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

    if (!hasGsap || reduceMotion) {
      // Show everything as-is; no splitting needed.
      targets.forEach((el) => el.classList.add('rt-ready'));
      return;
    }

    window.gsap.registerPlugin(window.ScrollTrigger);

    targets.forEach((el) => {
      const spans = splitWords(el);
      el.classList.add('rt-ready');
      window.gsap.set(spans, { yPercent: 115, opacity: 0 });

      window.gsap.to(spans, {
        yPercent: 0,
        opacity: 1,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.055,
        scrollTrigger: {
          trigger: el,
          start: 'top 82%',
          once: true
        }
      });
    });

    window.addEventListener('load', () => window.ScrollTrigger.refresh());
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(boot, 0);
  } else {
    window.addEventListener('DOMContentLoaded', boot);
  }
})();
