/* ONYX — pscroll.js
   Pinned "Our Process" scrollytelling (adapted from the React FrameSequenceHero).
   Pins the section, then scroll progress advances the step cards, fills the
   progress bar + card ticks, fades the hint, and scrubs the background video.
   Falls back to a plain numbered list without GSAP or under reduced motion. */
(function () {
  'use strict';

  const section = document.querySelector('.pscroll');
  if (!section) return;

  const cards = Array.from(section.querySelectorAll('.pcard'));
  const progressFill = section.querySelector('#pscrollProgress');
  const hint = section.querySelector('#pscrollHint');
  const video = section.querySelector('#pscrollVideo');
  const n = cards.length;
  if (!n) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap =
    typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  // No GSAP / reduced motion: show the accessible static list, skip the pin.
  if (!hasGsap || reduce) {
    section.classList.add('is-static');
    return;
  }

  window.gsap.registerPlugin(window.ScrollTrigger);

  // Scrub the background video's timeline (best-effort; some mp4s seek poorly).
  let videoDuration = 0;
  let videoScrubbable = false;
  if (video) {
    const markReady = () => {
      videoDuration = video.duration || 0;
      videoScrubbable = videoDuration > 0 && isFinite(videoDuration);
    };
    if (video.readyState >= 1) markReady();
    video.addEventListener('loadedmetadata', markReady, { once: true });
    // Kick off buffering.
    try { video.load(); } catch (e) { /* ignore */ }
  }

  function update(p) {
    p = Math.max(0, Math.min(1, p));
    const scaled = p * n;
    let active = Math.min(n - 1, Math.floor(scaled));
    const local = Math.max(0, Math.min(1, scaled - active));

    cards.forEach((card, i) => {
      card.classList.toggle('is-active', i === active);
      card.classList.toggle('is-prev', i < active);
      const ticks = card.querySelectorAll('[data-tick]');
      ticks.forEach((t, j) => {
        const sx = j < active ? 1 : j === active ? local : 0;
        t.style.transform = 'scaleX(' + sx + ')';
      });
    });

    if (progressFill) progressFill.style.width = p * 100 + '%';
    if (hint) hint.style.opacity = p > 0.02 ? '0' : '1';

    if (video && videoScrubbable) {
      const t = Math.min(videoDuration - 0.05, p * videoDuration);
      // Avoid redundant seeks (they stall the decoder).
      if (Math.abs(video.currentTime - t) > 0.03) {
        try { video.currentTime = t; } catch (e) { /* ignore */ }
      }
    }
  }

  window.ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: '+=' + n * 100 + '%', // ~100vh of scroll per step
    pin: true,
    scrub: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate: (self) => update(self.progress),
    onRefresh: (self) => update(self.progress)
  });

  update(0);
})();
