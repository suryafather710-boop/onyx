/* ONYX — textblock.js
   Per-line "block reveal": a colored block sweeps across each line (left→right),
   the text fades in behind it, then the block sweeps out to the right.
   Vanilla adaptation of the React TextBlockAnimation (no GSAP SplitText: lines
   are detected by measuring word positions). Degrades to plain text. */
(function () {
  'use strict';

  const els = Array.from(document.querySelectorAll('[data-textblock]'));
  if (!els.length) return;

  // Keep the pristine markup so we can restore + re-split on resize.
  els.forEach((el) => (el.dataset.tbOriginal = el.innerHTML));

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap =
    typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  // No GSAP or reduced motion: leave the original, fully-visible text as-is.
  if (!hasGsap || reduce) return;

  window.gsap.registerPlugin(window.ScrollTrigger);

  const instances = [];

  // Split an element's text into visual lines by measuring word offsets.
  function splitIntoLines(el) {
    const text = el.textContent.replace(/\s+/g, ' ').trim();
    el.textContent = '';

    const wordSpans = [];
    const words = text.split(' ');
    words.forEach((w, i) => {
      const s = document.createElement('span');
      s.textContent = w;
      s.style.display = 'inline-block'; // measurable per word
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      wordSpans.push(s);
    });

    // Group consecutive words that share a top offset into one line.
    const lines = [];
    let current = null;
    let lastTop = null;
    wordSpans.forEach((s) => {
      const top = s.offsetTop;
      if (lastTop === null || Math.abs(top - lastTop) > 3) {
        current = [];
        lines.push(current);
        lastTop = top;
      }
      current.push(s);
    });

    // Rebuild the element as a stack of line divs.
    el.textContent = '';
    return lines.map((lineWords) => {
      const lineEl = document.createElement('div');
      lineEl.className = 'tb-line';
      lineWords.forEach((s, i) => {
        s.style.display = 'inline';
        lineEl.appendChild(s);
        if (i < lineWords.length - 1) lineEl.appendChild(document.createTextNode(' '));
      });
      el.appendChild(lineEl);
      return lineEl;
    });
  }

  function build(el) {
    const blockColor = el.dataset.blockColor || 'var(--accent)';
    const lines = splitIntoLines(el);
    const blocks = [];

    lines.forEach((line) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'tb-wrap';

      const block = document.createElement('div');
      block.className = 'tb-block';
      block.style.backgroundColor = blockColor;

      line.parentNode.insertBefore(wrapper, line);
      wrapper.appendChild(line);
      wrapper.appendChild(block);

      window.gsap.set(line, { opacity: 0 });
      blocks.push(block);
    });

    if (!blocks.length) return;

    const duration = 0.6;
    const stagger = 0.08;

    const tl = window.gsap.timeline({
      defaults: { ease: 'expo.inOut' },
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      }
    });

    tl.to(blocks, { scaleX: 1, duration, stagger, transformOrigin: 'left center' })
      .set(lines, { opacity: 1, stagger }, `<${duration / 2}`)
      .to(blocks, { scaleX: 0, duration, stagger, transformOrigin: 'right center' }, `<${duration * 0.4}`);

    instances.push({ el, tl });
  }

  function initAll() {
    els.forEach(build);
    window.ScrollTrigger.refresh();
  }

  function destroyAll() {
    instances.forEach(({ el, tl }) => {
      if (tl) {
        if (tl.scrollTrigger) tl.scrollTrigger.kill();
        tl.kill();
      }
      el.innerHTML = el.dataset.tbOriginal;
    });
    instances.length = 0;
  }

  // Measure after fonts settle so line wrapping is accurate.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(initAll);
  } else {
    window.addEventListener('load', initAll);
  }

  // Re-split on resize (line breaks change with width).
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      destroyAll();
      initAll();
    }, 250);
  });
})();
