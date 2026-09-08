/* ONYX — work.js
   Cinematic pinned gallery for Selected Work. On wide screens the stage pins and
   the row of projects scrubs sideways as you scroll, with an image parallax tied
   to that horizontal motion, a live NN — NN counter and a progress thumb. Content
   stays visible throughout (transform-only), so nothing can be left hidden.

   Vanilla + the project's GSAP ScrollTrigger, and it reuses the proven horizontal
   pin/containerAnimation pattern. Engages only with motion allowed on wide
   screens; otherwise the CSS leaves a native horizontal swipe scroller. The
   lightbox (wired in main.js on .work-card) keeps working in both modes. */
(function () {
  'use strict';

  const section = document.querySelector('.work');
  if (!section) return;

  const track = section.querySelector('.work__track');
  const panels = Array.from(section.querySelectorAll('.wproject'));
  if (!track || panels.length < 2) return;

  const hasGsap =
    typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (!hasGsap) return; // CSS fallback = native swipe scroller

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const N = panels.length;
  const counterEl = document.getElementById('workCounter');
  const barEl = document.getElementById('workBar');
  const pad = (n) => String(n).padStart(2, '0');

  const mm = gsap.matchMedia();

  mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
    section.classList.add('is-pinned');

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
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress;
          const idx = Math.min(N - 1, Math.round(p * (N - 1)));
          if (counterEl) counterEl.textContent = pad(idx + 1);
          if (barEl) barEl.style.left = p * (100 - 100 / N) + '%';
          panels.forEach((panel, i) => panel.classList.toggle('is-active', i === idx));
        }
      }
    });

    // Image parallax within its scale buffer (edges never show), tied to the
    // horizontal scroll so it's always in sync and never leaves a blank.
    panels.forEach((panel) => {
      const img = panel.querySelector('.wproject__media img');
      if (!img) return;
      gsap.fromTo(
        img,
        { scale: 1.12, xPercent: 8 },
        {
          scale: 1.12,
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

    if (barEl) barEl.style.width = 100 / N + '%';
    ScrollTrigger.refresh();

    return () => {
      section.classList.remove('is-pinned');
      gsap.set(track, { clearProps: 'transform' });
      panels.forEach((panel) => {
        panel.classList.remove('is-active');
        const img = panel.querySelector('.wproject__media img');
        if (img) gsap.set(img, { clearProps: 'transform' });
      });
      if (barEl) { barEl.style.left = ''; barEl.style.width = ''; }
      if (counterEl) counterEl.textContent = '01';
    };
  });
})();
