/* ONYX — blackhole.js
   Site-wide scroll-driven singularity. A fixed canvas behind all content:
   a tilted accretion disk of warm motes orbiting a dark centre. Particles
   swirl (Keplerian — inner ones move faster) and spiral slowly inward; the
   whole disk SPINS with scroll and scroll velocity, so the background moves
   as you scroll — the effect from the reference sites, rebuilt in plain
   canvas with no libraries.

   Degrades to a single static frame under prefers-reduced-motion and pauses
   when the tab is hidden. Sits at z-index -1; atmospheric sections are
   transparent so it shows through (see main.css / sections.css). */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Warm palette. Inner disk runs hotter (bone/gold), outer edge cooler (ember).
  const COLORS = {
    hot: '245,238,220',
    gold: '201,168,76',
    ember: '196,78,54'
  };

  let canvas, ctx, dpr, w, h;
  let cx, cy, R; // centre + reference radius
  let particles = [];
  let sprites = new Map();
  let rimSprite = null;
  let raf = 0;
  let running = false;

  const DISK_TILT = -0.42; // radians — the disk is seen at an angle
  const Y_SQUASH = 0.46; // flattens the circle into an ellipse (perspective)

  let phi = 0; // global disk rotation (driven by scroll)
  let clock = 0; // ever-increasing time, for autonomous drift
  let flowX = 0, flowY = 0; // scroll-driven travel of the disk centre
  const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  let lastScroll = getScroll();
  let scrollVel = 0;

  function getScroll() {
    const l = window.onyxLenis;
    if (l && typeof l.scroll === 'number') return l.scroll;
    return window.scrollY || window.pageYOffset || 0;
  }

  // Pre-rendered soft glow sprite per colour (no per-frame gradients).
  function spriteFor(rgb) {
    if (sprites.has(rgb)) return sprites.get(rgb);
    const s = 64;
    const off = document.createElement('canvas');
    off.width = off.height = s;
    const c = off.getContext('2d');
    const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, `rgba(${rgb},1)`);
    g.addColorStop(0.4, `rgba(${rgb},0.5)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g;
    c.fillRect(0, 0, s, s);
    sprites.set(rgb, off);
    return off;
  }

  // The steady accretion glow ring: dark hole in the middle, warm rim, fade out.
  function buildRim() {
    const size = Math.round(Math.max(w, h) * 2);
    const off = document.createElement('canvas');
    off.width = off.height = size;
    const c = off.getContext('2d');
    const mid = size / 2;
    const g = c.createRadialGradient(mid, mid, 0, mid, mid, mid);
    g.addColorStop(0.0, 'rgba(0,0,0,0)'); // the void
    g.addColorStop(0.12, 'rgba(0,0,0,0)');
    g.addColorStop(0.2, `rgba(${COLORS.gold},0.16)`); // inner rim heat
    g.addColorStop(0.32, `rgba(${COLORS.ember},0.1)`);
    g.addColorStop(0.6, `rgba(${COLORS.ember},0.02)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);
    rimSprite = off;
  }

  function colorForRadius(t) {
    // t: 0 = inner edge, 1 = outer edge
    if (t < 0.28) return COLORS.hot;
    if (t < 0.62) return COLORS.gold;
    return COLORS.ember;
  }

  function makeParticle(seedRad) {
    const rMin = R * 0.17;
    const rMax = R * 1.15;
    const rad = seedRad != null ? seedRad : rMin + Math.random() * (rMax - rMin);
    const t = (rad - rMin) / (rMax - rMin);
    return {
      a: Math.random() * Math.PI * 2, // angle on the disk
      rad,
      // Keplerian-ish: inner particles orbit faster.
      spin: (0.0016 + 0.02 / Math.sqrt(rad / R + 0.15)) * (0.85 + Math.random() * 0.3),
      inward: (0.02 + Math.random() * 0.06) * (R / 900 + 0.4), // slow spiral in
      size: 0.5 + Math.random() * 1.7,
      color: colorForRadius(t),
      base: 0.16 + Math.random() * 0.5,
      jitter: (Math.random() - 0.5) * R * 0.04, // slight band thickness
      tw: Math.random() * Math.PI * 2,
      twSpeed: 0.006 + Math.random() * 0.014
    };
  }

  function targetCount() {
    const area = w * h;
    const density = window.innerWidth < 720 ? 22000 : 12000;
    return Math.max(60, Math.min(320, Math.round(area / density)));
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
    cx = w * 0.5;
    cy = h * 0.5;
    R = Math.min(w, h) * 0.62;
    buildRim();
    build();
  }

  const cosT = Math.cos(DISK_TILT);
  const sinT = Math.sin(DISK_TILT);

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // Centre drifts gently toward the pointer, wanders on its own, and
    // travels with scroll — so the field is always moving and clearly flows
    // as you scroll.
    const ox = (pointer.x - 0.5) * 40;
    const oy = (pointer.y - 0.5) * 40;
    const wanderX = Math.sin(clock * 0.00016) * w * 0.06;
    const wanderY = Math.cos(clock * 0.00012) * h * 0.05;
    const centerX = cx + ox + wanderX + flowX;
    const centerY = cy + oy + wanderY + flowY;

    // Steady accretion rim (drawn under the motes).
    if (rimSprite) {
      const rs = rimSprite.width / 2;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1;
      ctx.drawImage(rimSprite, centerX - rs / 2, centerY - rs / 2, rs, rs);
    }

    ctx.globalCompositeOperation = 'lighter';
    const rMin = R * 0.17;
    const rMax = R * 1.15;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      p.a += p.spin;
      p.rad -= p.inward;
      if (p.rad < rMin) {
        // fell past the horizon — respawn at the outer edge
        p.rad = rMax;
        p.a = Math.random() * Math.PI * 2;
      }
      p.tw += p.twSpeed;

      // Point on the (rotated, squashed) disk.
      const ang = p.a + phi;
      let dx = Math.cos(ang) * (p.rad + p.jitter);
      let dy = Math.sin(ang) * (p.rad + p.jitter) * Y_SQUASH;
      // rotate the ellipse by the tilt
      const rx = dx * cosT - dy * sinT;
      const ry = dx * sinT + dy * cosT;
      const x = centerX + rx;
      const y = centerY + ry;

      if (x < -60 || x > w + 60 || y < -60 || y > h + 60) continue;

      const twinkle = 0.6 + 0.4 * Math.sin(p.tw);
      // brighter on the near side of the disk (front of the orbit)
      const facing = 0.7 + 0.3 * Math.sin(ang);
      const alpha = Math.min(1, p.base * twinkle * facing);
      if (alpha <= 0.015) continue;

      const drawR = p.size * 3.4;
      ctx.globalAlpha = alpha;
      ctx.drawImage(spriteFor(p.color), x - drawR, y - drawR, drawR * 2, drawR * 2);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function tick() {
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    const s = getScroll();
    let dv = s - lastScroll;
    lastScroll = s;
    if (dv > 80) dv = 80;
    else if (dv < -80) dv = -80;
    scrollVel += (dv - scrollVel) * 0.1;

    clock += 16;

    // The disk always turns slowly; scrolling spins it noticeably faster.
    phi += 0.0016 + scrollVel * 0.0006;

    // Scroll pushes the disk centre (it "travels"); it eases back when idle.
    flowY += scrollVel * 0.9;
    flowX += scrollVel * 0.18;
    flowY *= 0.92;
    flowX *= 0.92;
    const maxFlow = Math.min(w, h) * 0.5;
    if (flowY > maxFlow) flowY = maxFlow; else if (flowY < -maxFlow) flowY = -maxFlow;
    if (flowX > maxFlow) flowX = maxFlow; else if (flowX < -maxFlow) flowX = -maxFlow;

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
    canvas.className = 'dustfield'; // reuse the existing fixed-layer styling
    canvas.setAttribute('aria-hidden', 'true');
    ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    document.body.insertBefore(canvas, document.body.firstChild);

    resize();

    if (reduceMotion) {
      draw();
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
