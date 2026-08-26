/* ONYX — preloader
   Animated 0%→100% counter, runs only on first visit per session. */
(function () {
  'use strict';

  const preloader = document.getElementById('preloader');
  if (!preloader) return;

  const countEl = document.getElementById('preloaderCount');
  const barEl = document.getElementById('preloaderBar');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const alreadySeen = sessionStorage.getItem('onyx_preloaded') === '1';

  function finish() {
    preloader.classList.add('is-done');
    document.body.classList.remove('is-locked');
    sessionStorage.setItem('onyx_preloaded', '1');
    window.setTimeout(() => {
      if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
    }, 1000);
    document.dispatchEvent(new CustomEvent('onyx:preloaded'));
  }

  // Skip animation on repeat visits or reduced motion.
  if (alreadySeen || reduceMotion) {
    preloader.classList.add('is-done');
    if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
    return;
  }

  document.body.classList.add('is-locked');

  let progress = 0;
  const tick = () => {
    // Ease toward 100 with a little randomness for a natural count.
    const step = Math.max(1, Math.round((100 - progress) * 0.08) + Math.random() * 3);
    progress = Math.min(100, progress + step);
    if (countEl) countEl.textContent = Math.floor(progress) + '%';
    if (barEl) barEl.style.width = progress + '%';

    if (progress < 100) {
      window.setTimeout(tick, 90 + Math.random() * 80);
    } else {
      window.setTimeout(finish, 450);
    }
  };

  window.setTimeout(tick, 250);
})();
