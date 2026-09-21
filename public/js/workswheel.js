/* ONYX — workswheel.js
   The Projects section as a wheel you turn (adapted from the React WorksWheel).
   At rest the projects sit in a ring around a label; scrolling blows the ring
   open into a vertical drum and carries each piece round to the front.

   Adapted for this site: instead of hijacking the mouse wheel (which fights
   Lenis), the wheel is driven by scroll progress through a pinned section — one
   number, `turn`, computed from the ScrollTrigger and written straight to the
   DOM. 0 is the ring; 1 is the drum with item 0 at the front; every whole number
   after is one more item turned past. Desktop + motion only; otherwise the CSS
   leaves a plain project grid. Cards keep the .work-card hooks so the lightbox
   still opens on click. */
(function () {
  'use strict';

  const section = document.querySelector('.wheel');
  if (!section) return;

  const pin = section.querySelector('[data-wheel-pin]');
  const ring = section.querySelector('[data-wheel-ring]');
  const cards = Array.from(section.querySelectorAll('[data-wheel-card]'));
  const faces = cards.map((c) => c.querySelector('[data-wheel-face]'));
  const labelEl = section.querySelector('[data-wheel-label]');
  const titleEl = section.querySelector('[data-wheel-title]');
  const indexItems = Array.from(section.querySelectorAll('[data-wheel-index] li'));
  if (!pin || !ring || cards.length < 2) return;

  const hasGsap =
    typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (!hasGsap) return; // CSS fallback = project grid

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  // Geometry (tuned together — see the source component's notes).
  const CARD_H = 0.38, CARD_MAX_W = 0.34, CARD_RATIO = 1.45;
  const STEP = 40, DRUM = 2.22, LENS = 2.7, RING_R = 1.14, BOW = 1.82;
  const TITLE = 0.124, CULL = 1.6;

  const count = cards.length;
  const last = count - 1;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rad = (deg) => (deg * Math.PI) / 180;
  const bowAt = (drumDeg, bow) => -bow * (1 - Math.cos(rad(drumDeg)));

  // Both states in one transform chain: ring terms fall away as m -> 1, drum
  // terms are zero while the ring is up.
  const place = (ringDeg, drumDeg, ringR, drumR, bow, m) =>
    'translateX(' + m * bowAt(drumDeg, bow) + 'px)' +
    ' rotateZ(' + (1 - m) * ringDeg + 'deg) translateY(' + -(1 - m) * ringR + 'px)' +
    ' rotateX(' + m * drumDeg + 'deg) translateZ(' + m * drumR + 'px)';

  let M = null; // current metrics

  function measure() {
    const w = pin.clientWidth, h = pin.clientHeight;
    const cardW = Math.min(h * CARD_H * CARD_RATIO, w * CARD_MAX_W);
    const cardH = cardW / CARD_RATIO;
    const ringR = cardH * RING_R;
    const ringScale = clamp(((2 * Math.PI * ringR) / count) * 0.82 / (cardW || 1), 0.16, 1);
    M = {
      cardW, cardH, ringR, ringScale,
      drumR: cardH * DRUM,
      bow: cardH * BOW,
      depth: cardH * LENS,
      title: cardH * TITLE
    };
    pin.style.perspective = M.depth + 'px';
    cards.forEach((card) => {
      card.style.width = cardW + 'px';
      card.style.height = cardH + 'px';
      card.style.marginLeft = -cardW / 2 + 'px';
      card.style.marginTop = -cardH / 2 + 'px';
    });
    if (labelEl) labelEl.style.fontSize = M.title + 'px';
    if (titleEl) titleEl.style.fontSize = M.title + 'px';
  }

  let activeIdx = -1;
  function render(t) {
    if (!M) return;
    const m = clamp(t, 0, 1);
    const pos = Math.max(0, t - 1);

    // The drum is pulled back so its front face lands on the picture plane.
    ring.style.transform = 'translateZ(' + -m * M.drumR + 'px)';

    for (let i = 0; i < count; i++) {
      const d = i - pos;
      const card = cards[i];
      card.style.transform = place(d * (360 / count), d * STEP, M.ringR, M.drumR, M.bow, m);
      card.style.opacity = m > 0.5 && Math.abs(d) > CULL ? '0' : '1';
      card.style.zIndex = String(Math.round(100 - Math.abs(d) * 2));
      const face = faces[i];
      if (face) face.style.transform = 'scale(' + lerp(M.ringScale, 1, m) + ')';
    }

    if (labelEl) labelEl.style.opacity = String(1 - m);
    if (titleEl) titleEl.style.opacity = String(m);

    const near = clamp(Math.round(pos), 0, last);
    if (near !== activeIdx) {
      activeIdx = near;
      if (titleEl) titleEl.textContent = cards[near].dataset.title || '';
      indexItems.forEach((li, i) => li.classList.toggle('is-active', i === near));
    }
  }

  const mm = gsap.matchMedia();

  mm.add('(min-width: 1026px) and (prefers-reduced-motion: no-preference)', () => {
    section.classList.add('is-live');
    // Tall enough that ring->drum plus turning past each item has room.
    section.style.height = (count + 1) * 100 + 'vh';

    measure();

    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6,
      pin: false,
      invalidateOnRefresh: true,
      onRefresh: measure,
      onUpdate: (self) => render(self.progress * (last + 1))
    });

    render(0);

    // Index clicks scroll the page to that item's turn position.
    const jump = (i) => {
      const turn = i + 1;
      const y = st.start + (turn / (last + 1)) * (st.end - st.start);
      if (window.onyxLenis) window.onyxLenis.scrollTo(y);
      else window.scrollTo({ top: y, behavior: 'smooth' });
    };
    const onIndexClick = (e) => {
      const btn = e.target.closest('[data-wheel-jump]');
      if (btn) jump(Number(btn.dataset.wheelJump));
    };
    const indexEl = section.querySelector('[data-wheel-index]');
    if (indexEl) indexEl.addEventListener('click', onIndexClick);

    ScrollTrigger.refresh();

    return () => {
      section.classList.remove('is-live');
      section.style.height = '';
      pin.style.perspective = '';
      if (indexEl) indexEl.removeEventListener('click', onIndexClick);
      st.kill();
      ring.style.transform = '';
      cards.forEach((c) => {
        c.style.cssText = c.style.cssText
          .replace(/transform:[^;]+;?/, '')
          .replace(/width:[^;]+;?/, '')
          .replace(/height:[^;]+;?/, '')
          .replace(/margin-left:[^;]+;?/, '')
          .replace(/margin-top:[^;]+;?/, '')
          .replace(/opacity:[^;]+;?/, '')
          .replace(/z-index:[^;]+;?/, '');
      });
      faces.forEach((f) => { if (f) f.style.transform = ''; });
      indexItems.forEach((li) => li.classList.remove('is-active'));
      if (labelEl) { labelEl.style.opacity = ''; labelEl.style.fontSize = ''; }
      if (titleEl) { titleEl.style.opacity = ''; titleEl.style.fontSize = ''; titleEl.textContent = ''; }
    };
  });
})();
