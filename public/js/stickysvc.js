/* ONYX — stickysvc.js
   Sticky content-scroll for Our Services (adapted from the React
   StickyContentWrapper). One tall section holds a CSS-sticky stage: on the left,
   the service cards crossfade in place; on the right, the images wipe away with
   a clip-path while the next one scales up underneath.

   Driven by a single scrubbed GSAP timeline — the whole thing is a pure function
   of scroll position, so nothing can ever be left stuck hidden on a fast flick
   (the bug we chased on the old horizontal deck). No snap: snapping fights Lenis
   and brings back the jitter. The clip-path wipe sits on the media wrapper and
   the scale sits on the <img> inside — separate elements, so Chrome never drops
   the paint. Desktop + motion only; otherwise the CSS leaves a readable stack. */
(function () {
  'use strict';

  const section = document.querySelector('.stsvc');
  if (!section) return;

  const contents = Array.from(section.querySelectorAll('[data-content]'));
  const medias = Array.from(section.querySelectorAll('[data-image]'));
  if (contents.length < 2 || medias.length !== contents.length) return;

  const hasGsap =
    typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (!hasGsap) return; // CSS fallback = readable vertical stack

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  // Don't let mobile browser-chrome resize thrash the sticky stage.
  ScrollTrigger.config({ ignoreMobileResize: true });

  const N = contents.length;

  // Transition. A simultaneous opacity crossfade briefly shows two texts stacked
  // in the same spot — they read as colliding words. Instead each card is an
  // opaque panel that SLIDES up over the previous one: the incoming card covers
  // the outgoing one, so two texts are never visible at once, and because the
  // outgoing card stays put until it's covered there's never a blank beat either.
  const DRIFT = -10;      // yPercent the covered card drifts to (parallax depth)
  const TRANS = 1.1;      // slide / image-wipe window
  const STEP = 2;         // scroll length of one service step (rest fills the tail)
  const SCALE_INITIAL = 1.5; // an image waiting off-screen
  const SCALE_ACTIVE = 1.2;  // the image on screen
  const SCALE_EXIT = 1;      // an image after it has wiped away

  const mm = gsap.matchMedia();

  mm.add('(min-width: 1026px) and (prefers-reduced-motion: no-preference)', () => {
    section.classList.add('is-live');
    // Tall section so the sticky stage has room to scrub through every step.
    section.style.height = N * 100 + 'vh';

    const imgs = medias.map((m) => m.querySelector('img'));

    // Initial state. Card 0 sits in place; the rest wait fully below the column
    // (yPercent 100), each stacked above the previous so it covers when it rises.
    contents.forEach((c, i) => {
      gsap.set(c, {
        autoAlpha: 1,
        yPercent: i === 0 ? 0 : 100,
        zIndex: i + 1
      });
    });
    medias.forEach((m, i) => {
      gsap.set(m, { zIndex: N - i, clipPath: 'inset(0% 0% 0% 0%)' });
    });
    imgs.forEach((img, i) => {
      if (img) gsap.set(img, { scale: i === 0 ? SCALE_ACTIVE : SCALE_INITIAL, transformOrigin: 'center center' });
    });

    const total = Math.max(1, (N - 1) * STEP);

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
        invalidateOnRefresh: true
      }
    });

    for (let i = 0; i < N - 1; i++) {
      const cur = contents[i];
      const next = contents[i + 1];
      const curImg = imgs[i];
      const nextImg = imgs[i + 1];
      const start = i * STEP;

      tl.fromTo(
          next,
          { yPercent: 100 },
          { yPercent: 0, duration: TRANS, ease: 'power2.inOut' },
          start
        )
        .to(cur, { yPercent: DRIFT, duration: TRANS, ease: 'power2.inOut' }, start)
        .to(medias[i], { clipPath: 'inset(0% 0% 100% 0%)', duration: TRANS, ease: 'power2.inOut' }, start);

      if (curImg) tl.to(curImg, { scale: SCALE_EXIT, duration: TRANS, ease: 'power2.inOut' }, start);
      if (nextImg) tl.to(nextImg, { scale: SCALE_ACTIVE, duration: TRANS, ease: 'power2.inOut' }, start);
    }

    tl.duration(total);

    // Entrance: coming out of the brand portal, show the first service's PICTURE
    // first, then fade its text up. Only the inner text bits animate (not the
    // card container, which the timeline drives via yPercent) so nothing fights.
    const firstItems = contents[0].querySelectorAll(
      '.stsvc__num, .stsvc__heading, .stsvc__p, .stsvc__list, .stsvc__link'
    );
    let introST = null;
    const reveal = () =>
      gsap.to(firstItems, {
        autoAlpha: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.09,
        ease: 'power2.out'
      });
    // Only arm the hidden state when the section is still below the fold, so a
    // reload already scrolled onto Services never leaves the text stuck hidden.
    if (firstItems.length && section.getBoundingClientRect().top > window.innerHeight * 0.6) {
      gsap.set(firstItems, { autoAlpha: 0, y: 36 });
      introST = ScrollTrigger.create({
        trigger: section,
        start: 'top 62%',
        once: true,
        onEnter: reveal
      });
    }

    ScrollTrigger.refresh();

    // Cleanup when the query stops matching (resize / motion pref change).
    return () => {
      section.classList.remove('is-live');
      section.style.height = '';
      if (introST) introST.kill();
      gsap.set(firstItems, { clearProps: 'all' });
      contents.forEach((c) => gsap.set(c, { clearProps: 'all' }));
      medias.forEach((m) => gsap.set(m, { clearProps: 'all' }));
      imgs.forEach((img) => { if (img) gsap.set(img, { clearProps: 'all' }); });
    };
  });
})();
