/* ONYX — preloader
   Animated 0%→100% counter, runs only on first visit per session.
   Bulletproof: a hard failsafe always reveals the site (unlocks the body and
   clears the overlay) even if the counter stalls or timers are throttled, so
   the page can never get stuck "not opening". */
(function () {
  'use strict';

  const preloader = document.getElementById('preloader');
  if (!preloader) return;

  const countEl = document.getElementById('preloaderCount');
  const barEl = document.getElementById('preloaderBar');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // sessionStorage can throw in private/blocked contexts — never let that kill
  // the script (which would leave the overlay up and the body locked forever).
  let alreadySeen = false;
  try { alreadySeen = sessionStorage.getItem('onyx_preloaded') === '1'; } catch (e) {}

  let done = false;
  function finish() {
    if (done) return;
    done = true;
    preloader.classList.add('is-done');
    document.body.classList.remove('is-locked');
    try { sessionStorage.setItem('onyx_preloaded', '1'); } catch (e) {}
    window.setTimeout(() => {
      if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
    }, 800);
    document.dispatchEvent(new CustomEvent('onyx:preloaded'));
  }

  // Skip animation on repeat visits or reduced motion.
  if (alreadySeen || reduceMotion) {
    preloader.classList.add('is-done');
    if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
    return;
  }

  document.body.classList.add('is-locked');

  // Hard failsafe — the intro never hangs: reveal within 2.6s no matter what.
  window.setTimeout(finish, 2600);

  let progress = 0;
  const tick = () => {
    if (done) return;
    // Ease toward 100 with a little randomness for a natural count.
    let step = Math.max(2, Math.round((100 - progress) * 0.12) + Math.random() * 4);
    progress = Math.min(100, progress + step);
    if (progress > 96) progress = 100; // snap the slow tail
    if (countEl) countEl.textContent = Math.floor(progress) + '%';
    if (barEl) barEl.style.width = progress + '%';

    if (progress < 100) {
      window.setTimeout(tick, 70 + Math.random() * 70);
    } else {
      window.setTimeout(finish, 350);
    }
  };

  window.setTimeout(tick, 200);
})();
