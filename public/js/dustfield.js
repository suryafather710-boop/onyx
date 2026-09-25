/* ONYX — dustfield.js
   Site-wide atmospheric particle field (Byotōne / Gravity vibe), built in
   plain canvas — no libraries. A fixed layer behind all content: warm dust
   motes that drift slowly, parallax with scroll + scroll VELOCITY, and lean
   gently toward the pointer. Degrades to a single static frame under
   prefers-reduced-motion, and pauses when the tab is hidden.

   Layering: the canvas sits at z-index -1 behind the page. Atmospheric
   sections (body, hero, philosophy, techcloud, stats, cta, core, promise,
   faq, contact, footer) are transparent so the field shows through; the
   pinned / photo sections paint over it on purpose. */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Palette — warm gold, ember red, and a faint bone white. Weighted so gold
  // dominates, ember is the rare larger glow, white is the fine sparkle.
  const COLORS = [
    { rgb: '201,168,76', weight: 0.5, size: [0.6, 1.8], glow: 1.0 }, // gold
    { rgb: '196,78,54', weight: 0.18, size: [1.0, 2.6], glow: 1.35 }, // ember
    { rgb: '240,239,233', weight: 0.32, size: [0.4, 1.2], glow: 0.85 } // bone
  ];

  let canvas, ctx, dpr, w, h;
  let particles = [];
  let sprites = new Map();
  let raf = 0;
  let running = false;

  // Pointer (lerped) + scroll tracking.
  const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: 0 };
  let lastScroll = getScroll();
  let scrollVel = 0; // smoothed pixels/frame

  function getScroll() {
    const l = window.onyxLenis;
    if (l && typeof l.scroll === 'number') return l.scroll;
    return window.scrollY || window.pageYOffset || 0;
  }

  function pickColor() {
    let r = Math.random();
    for (const c of COLORS) {
      if (r < c.weight) return c;
      r -= c.weight;
    }
    return COLORS[0];
  }

  // Pre-render a soft radial-gradient sprite per color so we never pay for
  // shadowBlur / gradients per particle at draw time.
  function spriteFor(color) {
    if (sprites.has(color.rgb)) return sprites.get(color.rgb);
    const s = 64;
    const off = document.createElement('canvas');
    off.width = off.height = s;
    const c = off.getContext('2d');
    const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, `rgba(${color.rgb},1)`);
    g.addColorStop(0.35, `rgba(${color.rgb},0.55)`);
    g.addColorStop(1, `rgba(${color.rgb},0)`);
    c.fillStyle = g;
    c.fillRect(0, 0, s, s);
    sprites.set(color.rgb, off);
    return off;
  }

  function makeParticle() {
    const color = pickColor();
    const [minS, maxS] = color.size;
    const depth = 0.25 + Math.random() * 0.75; // near = 1, far = 0.25 (parallax)
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      r: (minS + Math.random() * (maxS - minS)) * (0.7 + depth * 0.6),
      depth,
      color,
      // slow ambient drift
      vx: (Math.random() - 0.5) * 0.12,
      vy: -0.05 - Math.random() * 0.14, // gentle upward rise
      base: 0.24 + Math.random() * 0.6 * color.glow,
      // twinkle
      tw: Math.random() * Math.PI * 2,
      twSpeed: 0.004 + Math.random() * 0.012
    };
  }

  function targetCount() {
    const area = w * h;
    const density = window.innerWidth < 720 ? 26000 : 15000; // px² per mote
    return Math.max(30, Math.min(170, Math.round(area / density)));
  }

  function build() {
    particles = [];
    const n = targetCount();
    for (let i = 0; i < n; i++) particles.push(makeParticle());
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    // Pointer parallax offset (screen-space lean toward cursor).
    const px = (pointer.x - 0.5);
    const py = (pointer.y - 0.5);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Ambient drift.
      p.x += p.vx;
      p.y += p.vy;

      // Scroll parallax: field lags behind the page by depth, and reacts to
      // scroll velocity for a subtle "rush" while moving fast.
      p.y += scrollVel * p.depth * 0.35;

      // Wrap around edges (with a margin so motes fade in/out off-screen).
      const m = 40;
      if (p.y < -m) p.y = h + m;
      else if (p.y > h + m) p.y = -m;
      if (p.x < -m) p.x = w + m;
      else if (p.x > w + m) p.x = -m;

      // Twinkle.
      p.tw += p.twSpeed;
      const twinkle = 0.65 + 0.35 * Math.sin(p.tw);

      // Pointer lean (near motes move more than far ones).
      const ox = px * 46 * p.depth;
      const oy = py * 46 * p.depth;

      const alpha = Math.min(1, p.base * twinkle);
      if (alpha <= 0.01) continue;

      const drawR = p.r * 3.2; // sprite is a soft glow, draw larger than core
      ctx.globalAlpha = alpha;
      ctx.drawImage(
        spriteFor(p.color),
        p.x + ox - drawR,
        p.y + oy - drawR,
        drawR * 2,
        drawR * 2
      );
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function tick() {
    // Smooth pointer.
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    // Scroll velocity (smoothed, clamped).
    const s = getScroll();
    let dv = s - lastScroll;
    lastScroll = s;
    if (dv > 60) dv = 60;
    else if (dv < -60) dv = -60;
    scrollVel += (dv - scrollVel) * 0.12;

    draw();
    if (running) raf = requestAnimationFrame(tick);
  }

  function start() {
    if (running || reduceMotion) return;
    running = true;
    lastScroll = getScroll();
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function onPointer(e) {
    const t = e.touches ? e.touches[0] : e;
    if (!t) return;
    pointer.tx = t.clientX / w;
    pointer.ty = t.clientY / h;
  }

  function init() {
    canvas = document.createElement('canvas');
    canvas.className = 'dustfield';
    canvas.setAttribute('aria-hidden', 'true');
    ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    document.body.insertBefore(canvas, document.body.firstChild);

    resize();

    if (reduceMotion) {
      draw(); // one static frame, no loop
      return;
    }

    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(resize, 180);
    });
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('touchmove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
    });

    start();
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
