/**
 * ONYX — WebGL particle field
 * One point cloud that morphs between a shape per chapter as you scroll:
 * galaxy → sphere → helix → wave → torus → ring → "ONYX".
 * Each [data-shape] section in the page owns one shape.
 */
import * as THREE from '/vendor/three/three.module.min.js';

const canvas = document.getElementById('field');
const isMobile = window.matchMedia('(max-width: 820px)').matches;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const COUNT = isMobile ? 7000 : 16000;

function ready() {
  window.dispatchEvent(new Event('field:ready'));
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  console.warn('WebGL unavailable — field disabled.', e);
  canvas.remove();
  ready();
}

if (renderer) init();

// ---------------------------------------------------------------------------
// Shape generators — each returns Float32Array(COUNT * 3)
// ---------------------------------------------------------------------------
const TAU = Math.PI * 2;
const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}
function rotate(arr, rx, ry, rz) {
  const e = new THREE.Euler(rx, ry, rz);
  const v = new THREE.Vector3();
  for (let i = 0; i < arr.length; i += 3) {
    v.set(arr[i], arr[i + 1], arr[i + 2]).applyEuler(e);
    arr[i] = v.x; arr[i + 1] = v.y; arr[i + 2] = v.z;
  }
  return arr;
}
function offset(arr, ox, oy, oz) {
  for (let i = 0; i < arr.length; i += 3) { arr[i] += ox; arr[i + 1] += oy; arr[i + 2] += oz; }
  return arr;
}

function galaxy() {
  const a = new Float32Array(COUNT * 3);
  const arms = 3;
  for (let i = 0; i < COUNT; i++) {
    const r = Math.pow(Math.random(), 1.6) * 3.6 + 0.05;
    const arm = (i % arms) / arms * TAU;
    const spin = r * 1.25;
    const spread = 0.12 + r * 0.16;
    a[i * 3] = Math.cos(arm + spin) * r + gauss() * spread;
    a[i * 3 + 1] = gauss() * 0.08 * (1.4 - r / 4);
    a[i * 3 + 2] = Math.sin(arm + spin) * r + gauss() * spread;
  }
  rotate(a, 1.05, 0, -0.45);
  return offset(a, isMobile ? 0.4 : 1.9, isMobile ? -1.2 : -0.35, 0); // bright core sits in the open space right of the headline
}

function sphere() {
  const a = new Float32Array(COUNT * 3);
  const R = isMobile ? 1.5 : 1.9;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < COUNT; i++) {
    const shell = Math.random() < 0.82;
    const y = 1 - (i / (COUNT - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = golden * i;
    const r = shell ? R * (1 + gauss() * 0.018) : R * Math.cbrt(Math.random()) * 0.9;
    a[i * 3] = Math.cos(th) * rad * r;
    a[i * 3 + 1] = y * r;
    a[i * 3 + 2] = Math.sin(th) * rad * r;
  }
  return offset(a, isMobile ? 0 : 1.6, 0, 0);
}

function helix() {
  const a = new Float32Array(COUNT * 3);
  const L = 9, R = 0.95, turns = 3.2;
  for (let i = 0; i < COUNT; i++) {
    const t = Math.random();
    const x = (t - 0.5) * L;
    const ang = t * turns * TAU;
    const kind = Math.random();
    let y, z;
    if (kind < 0.84) {
      const strand = kind < 0.42 ? 0 : Math.PI;
      y = Math.cos(ang + strand) * R + gauss() * 0.07;
      z = Math.sin(ang + strand) * R + gauss() * 0.07;
    } else {
      // rungs between the strands
      const k = Math.floor(t * 64) / 64;
      const ang2 = k * turns * TAU;
      const s = rnd(-1, 1);
      y = Math.cos(ang2) * R * s + gauss() * 0.02;
      z = Math.sin(ang2) * R * s + gauss() * 0.02;
    }
    a[i * 3] = x;
    a[i * 3 + 1] = y;
    a[i * 3 + 2] = z;
  }
  rotate(a, 0.3, 0.35, 0.42);
  return a;
}

function wave() {
  const a = new Float32Array(COUNT * 3);
  const cols = Math.round(Math.sqrt(COUNT * 2.2));
  const rows = Math.ceil(COUNT / cols);
  for (let i = 0; i < COUNT; i++) {
    const cx = (i % cols) / cols;
    const cz = Math.floor(i / cols) / rows;
    const x = (cx - 0.5) * 12;
    const z = (cz - 0.5) * 6;
    const y = Math.sin(x * 0.7) * 0.45 + Math.cos(z * 1.3 + x * 0.3) * 0.35;
    a[i * 3] = x;
    a[i * 3 + 1] = y - 1.6;
    a[i * 3 + 2] = z;
  }
  return rotate(a, 0.5, 0, 0);
}


function ring() {
  const a = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const core = Math.random() < 0.18;
    let x, y, z;
    if (core) {
      const r = 0.55 * Math.cbrt(Math.random());
      const th = Math.random() * TAU, ph = Math.acos(rnd(-1, 1));
      x = r * Math.sin(ph) * Math.cos(th); y = r * Math.cos(ph); z = r * Math.sin(ph) * Math.sin(th);
    } else {
      const r = rnd(1.3, 3.1) + gauss() * 0.05;
      const th = Math.random() * TAU;
      x = Math.cos(th) * r; y = gauss() * 0.03; z = Math.sin(th) * r;
    }
    a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
  }
  rotate(a, 1.25, 0, 0.3);
  return offset(a, 0, 0, 0); // centred behind the FAQ column
}

function word(text, worldWidth) {
  const a = new Float32Array(COUNT * 3);
  const c = document.createElement('canvas');
  const W = 1000, H = 300;
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 250px Unbounded, "Arial Black", sans-serif';
  ctx.fillText(text, W / 2, H / 2 + 10);
  const data = ctx.getImageData(0, 0, W, H).data;
  const pts = [];
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      if (data[(y * W + x) * 4 + 3] > 128) pts.push(x, y);
    }
  }
  const scale = worldWidth / W;
  for (let i = 0; i < COUNT; i++) {
    if (pts.length) {
      const j = Math.floor(Math.random() * (pts.length / 2)) * 2;
      a[i * 3] = (pts[j] - W / 2 + rnd(-1, 1)) * scale;
      a[i * 3 + 1] = -(pts[j + 1] - H / 2 + rnd(-1, 1)) * scale;
      a[i * 3 + 2] = gauss() * 0.06;
    }
  }
  return a;
}

// ---------------------------------------------------------------------------
// "How we work" — one shape per phase. Built from simple parts (line
// segments, arcs, fills) sampled in proportion to their weight.
// ---------------------------------------------------------------------------
function fromParts(parts, depth = 0.07) {
  const a = new Float32Array(COUNT * 3);
  const total = parts.reduce((t, pt) => t + pt.w, 0);
  for (let i = 0; i < COUNT; i++) {
    let r = Math.random() * total, k = 0;
    while (r > parts[k].w && k < parts.length - 1) { r -= parts[k].w; k++; }
    const [x, y, z = 0] = parts[k].at();
    a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z + gauss() * depth;
  }
  return a;
}
const J = 0.035; // line jitter
const seg = (ax, ay, bx, by, w) => ({ w, at: () => { const t = Math.random(); return [ax + (bx - ax) * t + gauss() * J, ay + (by - ay) * t + gauss() * J]; } });
const arc = (cx, cy, r, w, a0 = 0, a1 = TAU) => ({ w, at: () => { const t = rnd(a0, a1); return [cx + Math.cos(t) * r + gauss() * J, cy + Math.sin(t) * r + gauss() * J]; } });
const disc = (cx, cy, r, w) => ({ w, at: () => { const t = Math.random() * TAU, d = r * Math.sqrt(Math.random()); return [cx + Math.cos(t) * d, cy + Math.sin(t) * d]; } });
const rect = (x0, y0, x1, y1, w) => [seg(x0, y0, x1, y0, w / 4), seg(x1, y0, x1, y1, w / 4), seg(x1, y1, x0, y1, w / 4), seg(x0, y1, x0, y0, w / 4)];
const fillRect = (x0, y0, x1, y1, w) => ({ w, at: () => [rnd(x0, x1), rnd(y0, y1)] });
const S = isMobile ? 0.8 : 1; // shapes a little smaller on phones
const scaled = (a) => { for (let i = 0; i < a.length; i++) a[i] *= S; return a; };

// 01 Discover — magnifying glass
function discoverShape() {
  const cx = -0.4, cy = 0.45, R = 1.3, ang = -Math.PI / 4;
  const hx = cx + Math.cos(ang) * R, hy = cy + Math.sin(ang) * R;      // where the handle meets the rim
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy * 0.2, ny = dx * 0.2, L = 1.9;
  return scaled(fromParts([
    arc(cx, cy, R, 0.34), arc(cx, cy, R * 0.86, 0.12),
    arc(cx, cy, R * 0.55, 0.05, 2.1, 2.9),                               // glint on the glass
    disc(cx, cy, R * 0.8, 0.07),
    seg(hx + nx, hy + ny, hx + nx + dx * L, hy + ny + dy * L, 0.13),
    seg(hx - nx, hy - ny, hx - nx + dx * L, hy - ny + dy * L, 0.13),
    seg(hx + nx + dx * L, hy + ny + dy * L, hx - nx + dx * L, hy - ny + dy * L, 0.04),
    { w: 0.1, at: () => { const t = Math.random() * L, o = rnd(-0.2, 0.2); return [hx + dx * t + (-dy) * o, hy + dy * t + dx * o]; } }
  ], 0.08));
}

// 02 Design — logo construction grid: square, circles, diagonals, centre lines
function designShape() {
  const h = 1.5;
  return scaled(fromParts([
    ...rect(-h, -h, h, h, 0.3),
    arc(0, 0, h, 0.2), arc(0, 0, h * 0.5, 0.08), arc(h * 0.5, h * 0.5, h * 0.5, 0.05),
    seg(-h, -h, h, h, 0.07), seg(-h, h, h, -h, 0.07),
    seg(-h * 1.25, 0, h * 1.25, 0, 0.05), seg(0, -h * 1.25, 0, h * 1.25, 0.05),
    disc(-h, -h, 0.12, 0.02), disc(h, -h, 0.12, 0.02), disc(h, h, 0.12, 0.02), disc(-h, h, 0.12, 0.02)
  ], 0.05));
}

// 03 Build — wireframe cube at an isometric angle (real 3D)
function buildShape() {
  const h = 1.15, v = [];
  for (const x of [-h, h]) for (const y of [-h, h]) for (const z of [-h, h]) v.push([x, y, z]);
  const edges = [];
  for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
    const d = v[i].reduce((n, c, k) => n + (c !== v[j][k] ? 1 : 0), 0);
    if (d === 1) edges.push([v[i], v[j]]);
  }
  const parts = edges.map(([a, b]) => ({ w: 0.06, at: () => { const t = Math.random(); return [0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * t + gauss() * J); } }));
  parts.push({ w: 0.18, at: () => { const ax = Math.floor(Math.random() * 3), s = Math.random() < 0.5 ? -h : h; const p = [rnd(-h, h), rnd(-h, h), rnd(-h, h)]; p[ax] = s; return p; } }); // faint faces
  parts.push(...v.map((c) => ({ w: 0.012, at: () => c.map((n) => n + gauss() * 0.07) })));               // bright corners
  const a = fromParts(parts, 0);
  rotate(a, 0.62, 0.79, 0);
  return scaled(a);
}

// 04 Grow — rising bar chart with an upward trend arrow
function growShape() {
  const base = -1.5, bw = 0.3, xs = [-1.5, -0.5, 0.5, 1.5], hs = [0.8, 1.45, 2.15, 3.0];
  const parts = [seg(-2.1, base, 2.2, base, 0.06)];
  xs.forEach((x, i) => {
    parts.push(...rect(x - bw, base, x + bw, base + hs[i], 0.13));
    parts.push(fillRect(x - bw, base, x + bw, base + hs[i], 0.04));
  });
  parts.push(seg(-2.0, -0.55, 1.75, 1.95, 0.16));                       // trend line
  parts.push(seg(1.75, 1.95, 1.15, 1.85, 0.03), seg(1.75, 1.95, 1.62, 1.35, 0.03)); // arrow head
  return scaled(fromParts(parts, 0.06));
}

// ---------------------------------------------------------------------------
async function init() {
  const DPR = Math.min(window.devicePixelRatio || 1, 2); // full retina sharpness
  renderer.setPixelRatio(DPR);
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, isMobile ? 9 : 7);

  // Wait (briefly) for fonts so the final "ONYX" shape uses Unbounded.
  try {
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
  } catch { /* ignore */ }

  const visibleW = () => 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z * camera.aspect;
  const shapes = [
    galaxy(), sphere(), helix(), wave(),            // 0 hero · 1 manifesto · 2 services · 3 work
    discoverShape(), ring(),                         // 4 process: Discover · 5 FAQ
    word('ONYX', Math.min(7.5, visibleW() * 0.82)),  // 6 contact
    designShape(), buildShape(), growShape()         // 7–9 process: Design · Build · Grow
  ];
  // Shapes that must face the viewer (flat drawings + the ONYX word): no spin.
  const FACING = new Set([4, 6, 7, 8, 9]);

  const geo = new THREE.BufferGeometry();
  const posA = new THREE.BufferAttribute(shapes[0].slice(), 3);
  const posB = new THREE.BufferAttribute(shapes[1].slice(), 3);
  const rand = new Float32Array(COUNT * 4);
  for (let i = 0; i < rand.length; i++) rand[i] = Math.random();
  geo.setAttribute('position', posA);
  geo.setAttribute('aTarget', posB);
  geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 4));

  const uniforms = {
    uTime: { value: 0 },
    uMix: { value: 0 },
    uSize: { value: isMobile ? 30 : 26 },
    uDPR: { value: DPR },
    uVel: { value: 0 },
    uMouse: { value: new THREE.Vector3(99, 99, 0) },
    uBone: { value: new THREE.Color('#efece6') },
    uVolt: { value: new THREE.Color('#ff3b30') },
    uFade: { value: 0 }
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec3 aTarget;
      attribute vec4 aRand;
      uniform float uTime, uMix, uSize, uDPR, uVel;
      uniform vec3 uMouse;
      varying float vAlpha;
      varying float vAccent;

      void main() {
        // staggered, eased morph with a mid-flight scatter
        float m = clamp(uMix * 1.45 - aRand.x * 0.45, 0.0, 1.0);
        m = m * m * (3.0 - 2.0 * m);
        vec3 p = mix(position, aTarget, m);
        p += (aRand.yzw - 0.5) * sin(m * 3.14159) * 1.6;

        // living drift, stronger when scrolling fast
        float t = uTime * 0.45;
        float amp = 0.035 + uVel * 0.25;
        p.x += sin(t + p.y * 1.9 + aRand.y * 6.28) * amp;
        p.y += cos(t * 1.1 + p.z * 1.7 + aRand.z * 6.28) * amp;
        p.z += sin(t * 0.8 + p.x * 1.3 + aRand.w * 6.28) * amp;

        vec4 world = modelMatrix * vec4(p, 1.0);

        // cursor repulsion
        vec3 d = world.xyz - uMouse;
        float f = smoothstep(1.3, 0.0, length(d.xy));
        world.xy += normalize(d.xy + 0.0001) * f * 0.45;

        vec4 mv = viewMatrix * world;
        gl_Position = projectionMatrix * mv;
        float s = uSize * (0.35 + aRand.w * 0.9) * uDPR;
        gl_PointSize = s / -mv.z;

        vAccent = step(0.955, aRand.y);
        vAlpha = (0.35 + aRand.z * 0.65) * smoothstep(14.0, 4.0, -mv.z);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uBone, uVolt;
      uniform float uFade;
      varying float vAlpha;
      varying float vAccent;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        // crisp core with a faint halo: sharp at any resolution, still luminous
        float core = 1.0 - smoothstep(0.16, 0.3, d);
        float halo = (1.0 - smoothstep(0.3, 0.5, d)) * 0.22;
        float a = (core + halo) * vAlpha * (1.0 - uFade);
        vec3 col = mix(uBone, uVolt, vAccent);
        gl_FragColor = vec4(col, a * (0.72 + vAccent * 0.28));
      }
    `
  });

  const points = new THREE.Points(geo, mat);
  const group = new THREE.Group();
  group.add(points);
  scene.add(group);

  // -------------------------------------------------------------------------
  // Scroll → shape progress
  // -------------------------------------------------------------------------
  let anchors = [];
  let shapeIdx = [];
  let dims = [];
  let morphs = [];
  function measure() {
    const els = [...document.querySelectorAll('[data-shape]')];
    anchors = els.map((el) => el.getBoundingClientRect().top + window.scrollY);
    shapeIdx = els.map((el) => Math.min(shapes.length - 1, parseInt(el.dataset.shape, 10) || 0));
    // how much to dim the field behind text-heavy chapters on phones
    dims = els.map((el) => parseFloat(el.dataset.fieldDim) || 0);
    // how much scroll (in viewport heights) the morph INTO each shape takes
    morphs = els.map((el) => parseFloat(el.dataset.morph) || 0.55);
  }
  measure();
  window.addEventListener('load', measure);
  window.addEventListener('onyx:refresh', measure);

  function targetProgress() {
    if (!anchors.length) return 0;
    const vh = window.innerHeight;
    const mid = window.scrollY + vh * 0.5;
    let i = 0;
    while (i < anchors.length - 1 && mid >= anchors[i + 1]) i++;
    if (i >= anchors.length - 1) return anchors.length - 1;
    const win = vh * (morphs[i + 1] || 0.55);
    const d = anchors[i + 1] - mid;
    const mix = d < win ? 1 - d / win : 0;
    return i + mix;
  }

  let progress = 0;
  let curA = -1, curB = -1;
  function setPair(a, b) {
    if (a === curA && b === curB) return;
    const sa = shapes[shapeIdx[a] ?? 0], sb = shapes[shapeIdx[b] ?? shapeIdx[a] ?? 0];
    posA.array.set(sa); posA.needsUpdate = true;
    posB.array.set(sb); posB.needsUpdate = true;
    curA = a; curB = b;
  }

  // -------------------------------------------------------------------------
  // Pointer
  // -------------------------------------------------------------------------
  const ndc = new THREE.Vector2(9, 9);
  const tilt = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
    ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }, { passive: true });
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();

  // Hide the field while the light "promise" panel fills the screen.
  const lightPanel = document.getElementById('promise');

  // -------------------------------------------------------------------------
  // Hotspots: DOM labels pinned to particles of a given shape. Each label
  // follows its particle through the scene rotation and fades in only
  // while its shape is the one on screen.
  // -------------------------------------------------------------------------
  const hotspots = [];
  const perShape = {};
  document.querySelectorAll('[data-hotspot]').forEach((el) => {
    const s = parseInt(el.dataset.hotspot, 10);
    (perShape[s] = perShape[s] || []).push(el);
  });
  Object.entries(perShape).forEach(([s, els]) => {
    els.forEach((el, k) => {
      const i = Math.floor(((k + 0.5) / els.length) * COUNT) * 3;
      const arr = shapes[s];
      if (!arr) return;
      hotspots.push({ el, shape: +s, pos: new THREE.Vector3(arr[i], arr[i + 1], arr[i + 2]) });
    });
  });
  const proj = new THREE.Vector3();
  // A label must never sit on top of text, buttons or images: probe what is
  // under it a few times a second and fade it out while it is covered.
  const BUSY = 'p, h1, h2, h3, li, a, button, label, input, textarea, figure, form, .statement, .intro, .seq__meta, .svc-names, .svc-details, .proc-steps, .hero__proof';
  let probeTick = 0;
  function covered(x, y) {
    const W = window.innerWidth, H = window.innerHeight;
    for (const dx of [8, 60, 110]) {
      const el = document.elementFromPoint(Math.min(W - 1, Math.max(0, x + dx)), Math.min(H - 1, Math.max(0, y)));
      if (el && el.closest(BUSY)) return true;
    }
    return false;
  }
  function placeHotspots(base, next, mix, fade) {
    if (!hotspots.length) return;
    group.updateMatrixWorld();
    const w2 = window.innerWidth / 2, h2 = window.innerHeight / 2;
    const probe = (probeTick++ % 6) === 0;
    for (const h of hotspots) {
      let w = 0;
      if (shapeIdx[base] === h.shape) w += 1 - mix;
      if (base !== next && shapeIdx[next] === h.shape) w += mix;
      const o = Math.max(0, Math.min(1, (w - 0.55) / 0.4)) * (1 - fade);
      if (o <= 0.001) { if (h.el.style.opacity !== '0') h.el.style.opacity = '0'; continue; }
      proj.copy(h.pos).applyMatrix4(group.matrixWorld).project(camera);
      if (proj.z > 1) { h.el.style.opacity = '0'; continue; }
      const x = proj.x * w2 + w2, y = -proj.y * h2 + h2;
      if (probe) h.blocked = covered(x, y);
      h.vis = (h.vis ?? 1) + ((h.blocked ? 0 : 1) - (h.vis ?? 1)) * 0.18;
      h.el.style.opacity = (o * h.vis).toFixed(3);
      h.el.style.transform = `translate3d(${(x - 6).toFixed(1)}px, ${(y - 14).toFixed(1)}px, 0)`;
    }
  }

  // -------------------------------------------------------------------------
  // Resize + loop
  // -------------------------------------------------------------------------
  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    measure();
  }
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  let rotY = 0;
  let animT = 0; // animation time; stands still while motion is paused
  let visible = true;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const paused = reduceMotion || (window.ONYX && window.ONYX.paused);
    if (!paused) animT += dt;

    // eased progress through the shapes
    const target = targetProgress();
    progress += (target - progress) * (reduceMotion ? 1 : Math.min(1, dt * 3.2));
    const base = Math.min(Math.floor(progress), anchors.length - 1);
    const next = Math.min(base + 1, anchors.length - 1);
    setPair(base, next);
    uniforms.uMix.value = base === next ? 0 : progress - base;

    const vel = Math.min(Math.abs((window.ONYX && window.ONYX.velocity) || 0) / 40, 1);
    uniforms.uVel.value += (vel - uniforms.uVel.value) * 0.08;
    uniforms.uTime.value = animT;

    // slow rotation + pointer tilt
    tilt.x += ((ndc.y > 5 ? 0 : ndc.y) * 0.18 - tilt.x) * 0.04;
    tilt.y += ((ndc.x > 5 ? 0 : ndc.x) * 0.28 - tilt.y) * 0.04;
    // the final "ONYX" word must face the camera: ease spin out as it forms
    let tw = FACING.has(shapeIdx[base]) ? 1 - (base === next ? 0 : uniforms.uMix.value) : 0;
    if (base !== next && FACING.has(shapeIdx[next])) tw += uniforms.uMix.value;
    if (!paused) rotY += dt * 0.06 * (1 - tw);
    const snap = Math.round(rotY / TAU) * TAU;
    group.rotation.x = tilt.x * (1 - tw * 0.5);
    group.rotation.y = rotY + (snap - rotY) * tw + tilt.y * (1 - tw * 0.5);

    // cursor in world space
    if (ndc.x < 5) {
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(plane, hit)) uniforms.uMouse.value.copy(hit);
    }

    // fade under the light panel
    let fade = 0;
    if (lightPanel) {
      const r = lightPanel.getBoundingClientRect();
      const vh = window.innerHeight;
      const cover = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) / vh;
      fade = Math.min(1, Math.max(0, (cover - 0.6) / 0.35));
    }
    // phones: dim the field behind text-heavy chapters so copy stays legible
    if (window.innerWidth <= 900 && dims.length) {
      const d = base === next ? dims[base] : dims[base] * (1 - uniforms.uMix.value) + dims[next] * uniforms.uMix.value;
      fade = Math.max(fade, d || 0);
    }
    uniforms.uFade.value = fade;

    renderer.render(scene, camera);
    placeHotspots(base, next, uniforms.uMix.value, fade);
  }
  frame();
  ready();
}
