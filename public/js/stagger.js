/* ONYX — stagger.js
   Staggered testimonial deck. Cards are centered in CSS; this positions them
   into a fan via transforms and rotates the order on click / arrow press.
   (Vanilla adaptation of the React "stagger-testimonials" component.) */
(function () {
  'use strict';

  const root = document.querySelector('[data-stagger]');
  if (!root) return;

  const cards = Array.from(root.querySelectorAll('.testi-card'));
  if (!cards.length) return;

  let cardSize = 365;

  // Current arrangement of card indices; the middle slot is the centered card.
  let order = cards.map((_, i) => i);

  function render() {
    const n = order.length;
    const center = Math.floor(n / 2);
    order.forEach((cardIdx, slot) => {
      const el = cards[cardIdx];
      const position = slot - center;
      const isCenter = position === 0;
      const ty = isCenter ? -65 : position % 2 ? 15 : -15;
      const rot = isCenter ? 0 : position % 2 ? 2.5 : -2.5;

      el.style.width = cardSize + 'px';
      el.style.height = cardSize + 'px';
      el.style.transform =
        'translate(-50%, -50%) ' +
        'translateX(' + (cardSize / 1.5) * position + 'px) ' +
        'translateY(' + ty + 'px) ' +
        'rotate(' + rot + 'deg)';
      el.style.zIndex = isCenter ? 10 : 0;
      el.style.boxShadow = isCenter
        ? '0px 8px 0px 4px var(--line-strong)'
        : '0px 0px 0px 0px transparent';
      el.classList.toggle('is-center', isCenter);
      el.setAttribute('aria-hidden', isCenter ? 'false' : 'true');
    });
  }

  function move(steps) {
    if (!steps) return;
    if (steps > 0) {
      for (let i = 0; i < steps; i++) order.push(order.shift());
    } else {
      for (let i = 0; i < -steps; i++) order.unshift(order.pop());
    }
    render();
  }

  // Click / keyboard a card to bring it to the center.
  cards.forEach((el) => {
    const toCenter = () => {
      const center = Math.floor(order.length / 2);
      const slot = order.indexOf(cards.indexOf(el));
      move(slot - center);
    };
    el.addEventListener('click', toCenter);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toCenter();
      }
    });
  });

  const prev = root.querySelector('[data-stagger-prev]');
  const next = root.querySelector('[data-stagger-next]');
  if (prev) prev.addEventListener('click', () => move(-1));
  if (next) next.addEventListener('click', () => move(1));

  function updateSize() {
    cardSize = window.matchMedia('(min-width: 640px)').matches ? 365 : 290;
    render();
  }

  updateSize();
  window.addEventListener('resize', updateSize);
})();
