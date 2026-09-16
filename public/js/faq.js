/* ONYX — faq.js
   Tabbed FAQ (adapted from the React FAQ-tabs component). Category tabs switch
   the visible panel with a crossfade; each question is an accordion with a
   plus -> x toggle. Vanilla, progressive: without JS every panel is shown and
   answers are open (see the .no-js rule in CSS), so nothing is hidden. */
(function () {
  'use strict';

  const section = document.querySelector('.faqx');
  if (!section) return;

  const tabs = Array.from(section.querySelectorAll('.faqx__tab'));
  const panels = Array.from(section.querySelectorAll('.faqx__panel'));

  /* ---- Accordion (single-open within a panel) ---- */
  const closeItem = (item) => {
    item.classList.remove('is-open');
    const btn = item.querySelector('.faqx__q');
    const panel = item.querySelector('.faqx__a');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    if (panel) panel.style.maxHeight = null;
  };

  const openItem = (item) => {
    item.classList.add('is-open');
    const btn = item.querySelector('.faqx__q');
    const panel = item.querySelector('.faqx__a');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    if (panel) panel.style.maxHeight = panel.scrollHeight + 'px';
  };

  section.querySelectorAll('.faqx__item').forEach((item) => {
    const btn = item.querySelector('.faqx__q');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');
      // Close siblings in the same panel.
      const parent = item.closest('.faqx__panel');
      if (parent) parent.querySelectorAll('.faqx__item').forEach((other) => {
        if (other !== item) closeItem(other);
      });
      isOpen ? closeItem(item) : openItem(item);
    });
  });

  /* ---- Tabs ---- */
  if (!tabs.length) return;

  const selectTab = (key, focus) => {
    tabs.forEach((tab) => {
      const active = tab.dataset.tab === key;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
    });
    panels.forEach((panel) => {
      const active = panel.dataset.panel === key;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
      // Reset any open answers in every panel so they start closed.
      panel.querySelectorAll('.faqx__item').forEach(closeItem);
      if (active) {
        // Re-trigger the entrance animation.
        panel.style.animation = 'none';
        // eslint-disable-next-line no-unused-expressions
        panel.offsetHeight; // reflow
        panel.style.animation = '';
      }
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => selectTab(tab.dataset.tab, false));
  });

  // Arrow-key navigation across the tablist.
  const tablist = section.querySelector('[role="tablist"]');
  if (tablist) {
    tablist.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const i = tabs.findIndex((t) => t.classList.contains('is-active'));
      let next = i;
      if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      else next = (i + (e.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length;
      selectTab(tabs[next].dataset.tab, true);
    });
  }
})();
