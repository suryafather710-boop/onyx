/* ONYX — gsap-init.js
   ScrollTrigger reveals, staggered cards, and animated stat counters.
   Degrades gracefully when GSAP is unavailable or reduced-motion is on. */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Fallback: if GSAP didn't load or motion is reduced, just reveal everything.
  function revealAll() {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
  }

  function initCounters(usingGsap) {
    document.querySelectorAll('.stat__num').forEach((el) => {
      const target = parseInt(el.dataset.count, 10);
      if (isNaN(target)) return;
      const suffix = el.dataset.suffix || '';
      const raw = el.dataset.raw === 'true'; // years: no thousands formatting

      const render = (val) => {
        const n = Math.floor(val);
        el.textContent = (raw ? String(n) : n.toLocaleString('en-US')) + suffix;
      };

      if (!usingGsap) {
        render(target);
        return;
      }

      const obj = { v: 0 };
      window.gsap.to(obj, {
        v: target,
        duration: 1.8,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        onUpdate: () => render(obj.v),
        onComplete: () => render(target)
      });
    });
  }

  // Split target text into word spans and reveal them on scroll (scrubbed),
  // reproducing the magicui "TextRevealByWord" effect with ScrollTrigger.
  function initTextReveal(usingGsap) {
    const scroller = document.querySelector('[data-text-reveal]');
    if (!scroller) return;

    const wordEls = [];
    scroller.querySelectorAll('[data-reveal-text]').forEach((el) => {
      const words = el.textContent.trim().split(/\s+/);
      el.textContent = '';
      words.forEach((w) => {
        const span = document.createElement('span');
        span.className = 'reveal-word';
        span.textContent = w;
        el.appendChild(span);
        el.appendChild(document.createTextNode(' ')); // preserve word spacing
        wordEls.push(span);
      });
    });

    if (!usingGsap || !wordEls.length) {
      wordEls.forEach((s) => (s.style.opacity = '1'));
      return;
    }

    window.gsap.set(wordEls, { opacity: 0.18 });
    const tl = window.gsap.timeline({
      scrollTrigger: {
        trigger: scroller,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.4
      }
    });
    // Sequential, slightly overlapping fades mapped across the scroll range.
    wordEls.forEach((el, i) => {
      tl.to(el, { opacity: 1, ease: 'none', duration: 1 }, i * 0.8);
    });
  }

  function boot() {
    const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

    if (!hasGsap || reduceMotion) {
      revealAll();
      initCounters(false);
      initTextReveal(false);
      return;
    }

    window.gsap.registerPlugin(window.ScrollTrigger);

    // Reveal each element on scroll into view.
    document.querySelectorAll('.reveal').forEach((el) => {
      window.ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: () => el.classList.add('is-visible')
      });
    });

    // Staggered reveal for card grids.
    document.querySelectorAll('.services__grid, .work__scroller').forEach((grid) => {
      const cards = grid.querySelectorAll('.reveal');
      cards.forEach((card, i) => card.style.setProperty('--i', i));
    });

    initCounters(true);
    initTextReveal(true);

    // Recalculate after images/fonts settle.
    window.addEventListener('load', () => window.ScrollTrigger.refresh());
  }

  // Wait for deferred GSAP scripts to be present.
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(boot, 0);
  } else {
    window.addEventListener('DOMContentLoaded', boot);
  }
})();
