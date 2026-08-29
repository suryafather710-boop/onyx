/* ONYX — portraitwall.js
   Scroll portrait wall (vanilla adaptation of the React ScrollPortraitWall).
   Builds a scattered portrait grid, then scrubs each portrait scale 0 -> 1 -> 0
   as it passes through the viewport, with a scroll hint that fades out.
   Rebuilds on breakpoint change; falls back to a static grid without GSAP or
   under reduced motion. */
(function () {
  'use strict';

  const section = document.querySelector('.spw');
  if (!section) return;

  const grid = section.querySelector('#spwGrid');
  const hint = section.querySelector('#spwHint');
  const dataEl = section.querySelector('#spwData');
  if (!grid || !dataEl) return;

  let speakers = [];
  try {
    speakers = JSON.parse(dataEl.textContent) || [];
  } catch (e) {
    return;
  }
  if (!speakers.length) return;

  const desired = Math.max(1, parseInt(section.dataset.spwColumns, 10) || 4);
  const showCaptions = section.dataset.spwCaptions === 'true';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap =
    typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (hasGsap) window.gsap.registerPlugin(window.ScrollTrigger);

  /* Deterministic scatter: one portrait per row, a second on every third row. */
  function buildLayout(count, cols) {
    const rows = [];
    let i = 0;
    let r = 0;
    while (i < count) {
      const row = new Array(cols).fill(-1);
      const a = (r * 2 + (r % 2)) % cols;
      row[a] = i++;
      if (r % 3 === 0 && i < count) {
        let b = (a + 2) % cols;
        if (b === a) b = (a + 1) % cols;
        row[b] = i++;
      }
      rows.push(row);
      r++;
    }
    return rows;
  }

  function currentCols() {
    if (window.matchMedia('(min-width: 1024px)').matches) return desired;
    if (window.matchMedia('(min-width: 640px)').matches) return Math.min(desired, 3);
    return Math.min(desired, 2);
  }

  function renderGrid(cols) {
    const layout = buildLayout(speakers.length, cols);
    const frag = document.createDocumentFragment();

    layout.forEach((row) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'spw__row';
      row.forEach((idx, ci) => {
        const cell = document.createElement('div');
        cell.className = 'spw__cell';
        if (idx !== -1) {
          const s = speakers[idx];
          const origin = ci < cols / 2 ? 'right bottom' : 'left bottom';
          const item = document.createElement('div');
          item.className = 'spw-item';
          item.style.transformOrigin = origin;
          item.style.transform = 'scale(0)';

          const img = document.createElement('img');
          img.src = s.src;
          img.alt = s.name || '';
          img.loading = 'lazy';
          img.decoding = 'async';
          img.draggable = false;
          item.appendChild(img);

          if (showCaptions && (s.name || s.role)) {
            const cap = document.createElement('div');
            cap.className = 'spw-item__cap';
            cap.innerHTML =
              '<span>' + (s.name || '') + '</span><span>(' + (s.role || '') + ')</span>';
            item.appendChild(cap);
          }
          cell.appendChild(item);
        }
        rowEl.appendChild(cell);
      });
      frag.appendChild(rowEl);
    });

    grid.innerHTML = '';
    grid.appendChild(frag);
  }

  let ctx = null;

  function build() {
    if (ctx) {
      ctx.revert();
      ctx = null;
    }
    const cols = currentCols();
    renderGrid(cols);

    const items = Array.from(grid.querySelectorAll('.spw-item'));

    if (!hasGsap || reduce) {
      items.forEach((el) => (el.style.transform = 'scale(1)'));
      return;
    }

    ctx = window.gsap.context(() => {
      // Hint fades away over the first stretch of scrolling.
      if (hint) {
        window.gsap.to(hint, {
          autoAlpha: 0,
          ease: 'none',
          scrollTrigger: { trigger: section, start: 'top top', end: '+=40%', scrub: true }
        });
      }

      // Each portrait scrubs scale 0 -> 1 -> 0 across its pass through the viewport.
      items.forEach((el) => {
        window.gsap
          .timeline({
            scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
          })
          .fromTo(el, { scale: 0 }, { scale: 1, ease: 'power2.out', duration: 0.5 })
          .to(el, { scale: 0, ease: 'power2.in', duration: 0.5 });
      });
    }, section);

    window.ScrollTrigger.refresh();
  }

  // Initial build after images/fonts settle so ScrollTrigger measures correctly.
  if (document.readyState === 'complete') build();
  else window.addEventListener('load', build, { once: true });

  // Rebuild when the responsive column count changes.
  let lastCols = currentCols();
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const c = currentCols();
      if (c !== lastCols) {
        lastCols = c;
        build();
      } else if (hasGsap && !reduce) {
        window.ScrollTrigger.refresh();
      }
    }, 250);
  });
})();
