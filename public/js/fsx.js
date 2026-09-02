/* ONYX — fsx.js
   Full-screen scroll slideshow for the process section (adapted from the React
   FullScreenScrollFX). Pins the stage and steps through sections on scroll:
   crossfades the gradient backgrounds, mask-slides the centre title, and centres
   the active row of the side lists. Desktop only; collapses to a readable list
   on mobile / reduced motion. */
(function () {
  'use strict';

  const root = document.querySelector('.fsx');
  if (!root) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap =
    typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  if (!hasGsap || reduce) {
    root.classList.add('is-static');
    return;
  }

  const gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);
  const mm = gsap.matchMedia();

  // --- Mobile / small screens: static list, no pin ---
  mm.add('(max-width: 900px)', () => {
    root.classList.add('is-static');
    return () => root.classList.remove('is-static');
  });

  // --- Desktop: the pinned slideshow ---
  mm.add('(min-width: 901px)', () => {
    const pinSection = root.querySelector('.fsx__pin-section');
    const pin = root.querySelector('.fsx__pin');
    const bgs = root.querySelectorAll('.fsx__bg');
    const titles = root.querySelectorAll('.fsx__title');
    const leftItems = root.querySelectorAll('.fsx__left .fsx__item');
    const rightItems = root.querySelectorAll('.fsx__right .fsx__item');
    const leftTrack = root.querySelector('.fsx__left .fsx__track');
    const rightTrack = root.querySelector('.fsx__right .fsx__track');
    const progressFill = root.querySelector('.fsx__progress-fill');
    const curNum = root.querySelector('.fsx__num-cur');
    const N = bgs.length;
    if (!N) return;

    const words = Array.from(titles).map((t) => Array.from(t.querySelectorAll('.fsx__word')));

    let current = 0;
    let animating = false;

    const rowH = (items) =>
      items.length > 1
        ? items[1].getBoundingClientRect().top - items[0].getBoundingClientRect().top
        : items[0].getBoundingClientRect().height;

    const centerLists = (idx, animate) => {
      [[leftTrack, leftItems], [rightTrack, rightItems]].forEach(([track, items]) => {
        if (!track || !items.length) return;
        const ch = track.parentElement.getBoundingClientRect().height;
        const y = ch / 2 - rowH(items) / 2 - idx * rowH(items);
        if (animate) gsap.to(track, { y, duration: 0.7, ease: 'power3.out' });
        else gsap.set(track, { y });
      });
    };

    const setActive = (idx) => {
      leftItems.forEach((el, i) => el.classList.toggle('is-active', i === idx));
      rightItems.forEach((el, i) => el.classList.toggle('is-active', i === idx));
    };

    // Initial states.
    gsap.set(bgs, { opacity: 0 });
    gsap.set(bgs[0], { opacity: 1 });
    words.forEach((w, i) => gsap.set(w, { yPercent: i === 0 ? 0 : 115, opacity: i === 0 ? 1 : 0 }));
    setActive(0);
    centerLists(0, false);

    const change = (to) => {
      to = Math.max(0, Math.min(N - 1, to));
      if (to === current || animating) return;
      const from = current;
      const down = to > from;
      animating = true;

      gsap.to(bgs[from], { opacity: 0, duration: 0.8, ease: 'power2.out' });
      gsap.set(bgs[to], { opacity: 0 });
      gsap.to(bgs[to], { opacity: 1, duration: 0.8, ease: 'power2.out' });

      gsap.to(words[from], { yPercent: down ? -115 : 115, opacity: 0, duration: 0.45, ease: 'power3.in' });
      gsap.set(words[to], { yPercent: down ? 115 : -115, opacity: 0 });
      gsap.to(words[to], { yPercent: 0, opacity: 1, duration: 0.7, ease: 'power3.out' });

      centerLists(to, true);
      setActive(to);
      if (progressFill) progressFill.style.width = (to / (N - 1 || 1)) * 100 + '%';
      if (curNum) curNum.textContent = String(to + 1).padStart(2, '0');

      gsap.delayedCall(0.7, () => {
        current = to;
        animating = false;
      });
    };

    const st = window.ScrollTrigger.create({
      trigger: pinSection,
      start: 'top top',
      end: 'bottom bottom',
      pin: pin,
      pinSpacing: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onRefresh: () => centerLists(current, false),
      onUpdate: (self) => {
        const target = Math.min(N - 1, Math.floor(self.progress * N));
        if (target !== current && !animating) {
          change(current + (target > current ? 1 : -1));
        }
      }
    });

    return () => {
      if (st) st.kill();
      gsap.set([leftTrack, rightTrack], { clearProps: 'transform' });
    };
  });
})();
