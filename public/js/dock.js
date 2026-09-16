/* ONYX — dock.js
   macOS-style magnify for the hero floating dock (adapted from the React
   FloatingDock). As the cursor moves along the dock, each item grows based on
   its distance from the pointer; items ease back with a CSS transition (our
   stand-in for the component's spring). Pointer devices only — touch/reduced
   motion keep the dock at its calm base size. */
(function () {
  'use strict';

  const dock = document.querySelector('[data-dock]');
  if (!dock) return;

  const items = Array.from(dock.querySelectorAll('.dock__item'));
  if (!items.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;
  if (reduce || !fine) return; // static dock on touch / reduced motion

  const BASE = 44;   // resting diameter (px)
  const MAX = 78;    // diameter directly under the cursor
  const RANGE = 150; // falloff distance (px), matches the component's [-150,150]

  let raf = 0;
  let mouseX = null;

  const render = () => {
    raf = 0;
    items.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      let size = BASE;
      if (mouseX !== null) {
        const dist = Math.abs(mouseX - center);
        if (dist < RANGE) {
          // Linear falloff, same shape as the component's useTransform ramp.
          size = BASE + (MAX - BASE) * (1 - dist / RANGE);
        }
      }
      item.style.width = size + 'px';
      item.style.height = size + 'px';
    });
  };

  const schedule = () => { if (!raf) raf = requestAnimationFrame(render); };

  dock.addEventListener('pointermove', (e) => { mouseX = e.clientX; schedule(); });
  dock.addEventListener('pointerleave', () => { mouseX = null; schedule(); });
})();
