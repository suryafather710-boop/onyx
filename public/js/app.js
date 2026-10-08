/**
 * ONYX — app.js
 * Smooth scroll, preloader, the scroll-revealed hero statement, pinned
 * chapter sequences, chapter nav, HUD, motion toggle, cursor and the form.
 */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  window.ONYX = { velocity: 0, paused: false };

  // -------------------------------------------------------------------------
  // Text scramble (decoding labels). Headings keep their real text for
  // screen readers via aria-label while the visible text decodes.
  // -------------------------------------------------------------------------
  const GLYPHS = '!<>-_\\/[]{}—=+*^?#01ABCDEFXYZ';
  function scramble(el, finalText, duration = 900) {
    const text = finalText ?? el.dataset.text ?? el.textContent;
    el.dataset.text = text;
    if (/^H\d$/.test(el.tagName) && !el.hasAttribute('aria-label')) el.setAttribute('aria-label', text);
    if (reduceMotion) { el.textContent = text; return; }
    const start = performance.now();
    cancelAnimationFrame(el._scr);
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const revealed = Math.floor(p * text.length);
      let out = '';
      for (let i = 0; i < text.length; i++) {
        out += i < revealed || text[i] === ' ' ? text[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) el._scr = requestAnimationFrame(tick);
    };
    el._scr = requestAnimationFrame(tick);
  }

  // -------------------------------------------------------------------------
  // Preloader (timer-driven so it can never stall)
  // -------------------------------------------------------------------------
  const preloader = $('#preloader');
  const bar = $('#preloaderBar');
  const pct = $('#preloaderPct');
  const loaderLine = $('[data-scramble-loop]');
  const lines = ['Entering the field…', 'Cutting the stone…', 'Built for brands that lead.'];
  let lineIdx = 0;
  scramble(loaderLine, lines[0]);
  const lineTimer = setInterval(() => { lineIdx = (lineIdx + 1) % lines.length; scramble(loaderLine, lines[lineIdx]); }, 1300);

  let loadShown = 0, loadTarget = 0.15, pageLoaded = false, fieldReady = false;
  const bump = () => { loadTarget = 0.15 + (pageLoaded ? 0.45 : 0) + (fieldReady ? 0.4 : 0); };
  window.addEventListener('load', () => { pageLoaded = true; bump(); });
  window.addEventListener('field:ready', () => { fieldReady = true; bump(); });
  if (document.readyState === 'complete') { pageLoaded = true; bump(); }
  setTimeout(() => { pageLoaded = fieldReady = true; bump(); }, 2500); // first impression matters

  let done = false;
  const loadTimer = setInterval(() => {
    loadShown += (loadTarget - loadShown) * 0.14 + 0.01;
    loadShown = Math.min(loadShown, loadTarget);
    if (document.hidden) loadShown = loadTarget;
    bar.style.width = (loadShown * 100).toFixed(1) + '%';
    pct.textContent = String(Math.round(loadShown * 100)).padStart(3, '0');
    if (loadShown >= 0.999 && !done) { done = true; clearInterval(loadTimer); setTimeout(exitPreloader, 250); }
  }, 16);

  function exitPreloader() {
    clearInterval(lineTimer);
    document.body.classList.remove('is-loading');
    if (!hasGSAP) { preloader.remove(); return; }
    gsap.timeline({ onComplete: () => preloader.remove() })
      .to('.preloader__inner', { opacity: 0, y: -20, duration: 0.5, ease: 'power2.in' })
      .to(preloader, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=0.1')
      .add(heroIntro, '-=0.6');
    ScrollTrigger.refresh();
  }

  if (!hasGSAP) { console.warn('GSAP failed to load — showing static site.'); return; }
  gsap.registerPlugin(ScrollTrigger);

  // -------------------------------------------------------------------------
  // Smooth scroll — lerp-based so it tracks the wheel closely (not floaty)
  // -------------------------------------------------------------------------
  let lenis = null;
  if (!reduceMotion && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1, smoothWheel: true });
    lenis.on('scroll', (e) => { window.ONYX.velocity = e.velocity; ScrollTrigger.update(); });
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  } else {
    let last = window.scrollY;
    gsap.ticker.add(() => { const y = window.scrollY; window.ONYX.velocity = y - last; last = y; });
  }
  const startScroll = () => lenis && lenis.start();

  function scrollToTarget(el) {
    // force + start: scrolling may be locked (open menu / thank-you dialog) at click time
    if (lenis) { lenis.start(); lenis.scrollTo(el, { offset: 0, duration: 1.4, force: true }); }
    else el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const el = id === '#top' || id === '#' ? document.body : $(id);
      if (!el) return;
      e.preventDefault();
      closeMenu();
      scrollToTarget(el);
      // move keyboard focus to the destination as well
      if (el !== document.body && el.hasAttribute('tabindex')) el.focus({ preventScroll: true });
    });
  });

  // -------------------------------------------------------------------------
  // Rolling button labels (second line is hidden from screen readers)
  // -------------------------------------------------------------------------
  if (!reduceMotion) {
    $$('.btn > span:first-child:not(.btn__label), .nav__cta').forEach((el) => {
      const t = el.textContent.trim();
      if (!t) return;
      el.innerHTML = '<span class="roll"><span>' + t + '</span><span aria-hidden="true">' + t + '</span></span>';
    });
  }

  // -------------------------------------------------------------------------
  // A · Hero — the whole message lands within ~1.5s of the page opening
  // -------------------------------------------------------------------------
  const words = $$('#statement .sw');
  gsap.set(words, { opacity: 0, y: 30, filter: 'blur(10px)' });
  gsap.set('[data-hero-in]', { opacity: 0, y: 20 });

  function heroIntro() {
    const tl = gsap.timeline({ onComplete: startScroll });
    tl.to(words, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, stagger: 0.08, ease: 'expo.out' })
      .to('[data-hero-in]', { opacity: 1, y: 0, duration: 0.8, stagger: 0.07, ease: 'power3.out' }, '-=0.7');
    return tl;
  }

  // gentle exit as you scroll past
  gsap.to('.hero__stage', {
    y: -70, opacity: 0.25, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });

  // -------------------------------------------------------------------------
  // Line-mask headings  [data-lines]
  // -------------------------------------------------------------------------
  $$('[data-lines]').forEach((el) => {
    el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i)
      .map((p) => `<span class="line-mask"><span>${p.trim()}</span></span>`).join('');
    const inner = $$('.line-mask > span', el);
    gsap.set(inner, { yPercent: 110 });
    ScrollTrigger.create({
      trigger: el, start: 'top 85%', once: true,
      onEnter: () => gsap.to(inner, { yPercent: 0, duration: 1.3, stagger: 0.12, ease: 'expo.out' })
    });
  });

  // -------------------------------------------------------------------------
  // Word-by-word scroll reveal  [data-words]
  // -------------------------------------------------------------------------
  function wrapWords(node) {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((tok) => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) frag.appendChild(document.createTextNode(' '));
          else { const s = document.createElement('span'); s.className = 'w'; s.textContent = tok; frag.appendChild(s); }
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1) wrapWords(child);
    });
  }
  $$('[data-words]').forEach((el) => {
    wrapWords(el);
    const ws = $$('.w', el);
    // [data-pop]: each word rises into place as it lights up (manifesto)
    const pop = el.hasAttribute('data-pop');
    gsap.fromTo(ws, pop ? { opacity: 0.1, yPercent: 45 } : { opacity: 0.12 }, {
      opacity: 1, yPercent: 0, ease: pop ? 'power2.out' : 'none', stagger: 0.08,
      scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 55%', scrub: 0.3 }
    });
  });

  // -------------------------------------------------------------------------
  // Word carousel [data-carousel]: the current word exits up, the next one
  // rises in (y ±20px, 0.3s). Pauses off-screen, when motion is paused, and
  // never runs for reduced-motion users (they see the first phrase).
  // -------------------------------------------------------------------------
  $$('[data-carousel]').forEach((el) => {
    let words = [];
    try { words = JSON.parse(el.dataset.words || '[]'); } catch { /* bad JSON */ }
    if (words.length < 2 || reduceMotion) return;
    const every = (parseFloat(el.dataset.interval) || 2) * 1000;
    let i = 0, timer = null, onScreen = false;
    const swap = () => {
      if (window.ONYX.paused) return;
      i = (i + 1) % words.length;
      gsap.timeline()
        .to(el, { y: -20, opacity: 0, duration: 0.3, ease: 'power2.in' })
        .add(() => { el.textContent = words[i]; })
        .fromTo(el, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
    };
    const run = () => { if (!timer && onScreen) timer = setInterval(swap, every); };
    const stop = () => { clearInterval(timer); timer = null; };
    new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; onScreen ? run() : stop(); }).observe(el);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : run()));
  });

  $$('[data-scramble]').forEach((el) => {
    ScrollTrigger.create({ trigger: el, start: 'top 90%', onEnter: () => scramble(el) });
  });

  gsap.set('[data-reveal]', { opacity: 0, y: 36 });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%', once: true,
    onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 1.1, stagger: 0.09, ease: 'power3.out' })
  });

  // -------------------------------------------------------------------------
  // Marquee — drifts, speeds up and flips with scroll direction
  // -------------------------------------------------------------------------
  const track = $('.marquee__track');
  if (track) {
    let x = 0, dir = -1;
    gsap.ticker.add(() => {
      if (reduceMotion || window.ONYX.paused) return;
      const v = window.ONYX.velocity || 0;
      if (Math.abs(v) > 0.5) dir = v > 0 ? -1 : 1;
      x += (0.6 + Math.min(Math.abs(v) * 0.35, 14)) * dir;
      const half = track.scrollWidth / 2;
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      track.style.transform = `translate3d(${x}px,0,0)`;
    });
  }

  // -------------------------------------------------------------------------
  // C/D · Pinned sequences — one item in focus at a time
  // -------------------------------------------------------------------------
  $$('[data-seq]').forEach((sec) => {
    const groups = [...new Set($$('[data-seq-item]', sec).map((el) => el.parentElement))]
      .map((parent) => [...parent.children].filter((c) => c.hasAttribute('data-seq-item')));
    const ticks = $$('[data-seq-tick]', sec);
    const indexEl = $('[data-seq-index]', sec);
    const barEl = $('[data-seq-bar]', sec);
    const n = groups[0] ? groups[0].length : 0;
    let current = -1;
    const set = (i) => {
      if (i === current) return;
      current = i;
      groups.forEach((g) => g.forEach((el, k) => el.classList.toggle('is-on', k === i)));
      ticks.forEach((el, k) => el.classList.toggle('is-on', k <= i));
      if (indexEl) indexEl.textContent = String(i + 1).padStart(2, '0');
    };
    set(0);
    ScrollTrigger.create({
      trigger: sec, start: 'top top', end: 'bottom bottom',
      onUpdate: (self) => {
        set(Math.min(n - 1, Math.floor(self.progress * n * 0.9999)));
        if (barEl) barEl.style.transform = `scaleX(${self.progress.toFixed(3)})`;
      }
    });
  });

  // Work: the phone rises and turns slightly as the chapter passes
  $$('[data-phone]').forEach((ph) => {
    gsap.fromTo(ph, { y: 110, rotate: -5 }, {
      y: -50, rotate: 2, ease: 'none',
      scrollTrigger: { trigger: ph.closest('.work'), start: 'top bottom', end: 'bottom top', scrub: 0.4 }
    });
  });

  // Light panel settles in as it arrives
  gsap.fromTo('.promise', { scale: 0.93 }, {
    scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.promise', start: 'top bottom', end: 'top 25%', scrub: true }
  });

  gsap.from('.footer__word span', {
    yPercent: 60, opacity: 0, stagger: 0.08, duration: 1.2, ease: 'expo.out',
    scrollTrigger: { trigger: '.footer__word', start: 'top 95%', once: true }
  });

  // -------------------------------------------------------------------------
  // Chapter nav, mobile chip, light-mode nav/HUD over the light panel
  // -------------------------------------------------------------------------
  const nav = $('#nav');
  const hud = $('.hud');
  const navChip = $('#navChip');
  const links = $$('[data-chapter-link]');
  function setChapter(letter) {
    links.forEach((l) => {
      const on = l.dataset.chapterLink === letter;
      l.classList.toggle('is-active', on);
      if (on) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current');
    });
    if (navChip) navChip.textContent = letter;
  }
  setChapter('A');
  $$('[data-chapter]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec, start: 'top 50%', end: 'bottom 50%',
      onToggle: (self) => { if (self.isActive) setChapter(sec.dataset.chapter); }
    });
  });
  ScrollTrigger.create({ trigger: '.promise', start: 'top 40px', end: 'bottom 40px', onToggle: (s) => nav.classList.toggle('is-light', s.isActive) });
  ScrollTrigger.create({ trigger: '.promise', start: 'top bottom-=30', end: 'bottom bottom-=30', onToggle: (s) => hud.classList.toggle('is-light', s.isActive) });

  ScrollTrigger.addEventListener('refresh', () => window.dispatchEvent(new Event('onyx:refresh')));

  // -------------------------------------------------------------------------
  // Progress rail
  // -------------------------------------------------------------------------
  const thumb = $('#railThumb');
  gsap.ticker.add(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? window.scrollY / max : 0;
    thumb.style.top = (p * 86).toFixed(2) + '%';
  });

  // -------------------------------------------------------------------------
  // Pause-motion toggle (WCAG 2.2.2) — freezes field, marquee and grain
  // -------------------------------------------------------------------------
  const motionBtn = $('#motionToggle');
  function setPaused(p) {
    window.ONYX.paused = p;
    document.documentElement.classList.toggle('is-still', p);
    motionBtn.setAttribute('aria-pressed', String(p));
    motionBtn.setAttribute('aria-label', p ? 'Resume motion' : 'Pause motion');
    try { localStorage.setItem('onyx-motion', p ? 'off' : 'on'); } catch { /* storage unavailable */ }
  }
  let saved = null;
  try { saved = localStorage.getItem('onyx-motion'); } catch { /* storage unavailable */ }
  if (saved === 'off') setPaused(true);
  motionBtn.addEventListener('click', () => setPaused(!window.ONYX.paused));

  // -------------------------------------------------------------------------
  // Menu
  // -------------------------------------------------------------------------
  const burger = $('#burger');
  const menu = $('#menu');
  function closeMenu() {
    if (!document.body.classList.contains('menu-open')) return;
    document.body.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
    if (lenis) lenis.start();
  }
  burger.addEventListener('click', () => {
    const open = !document.body.classList.contains('menu-open');
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
    if (lenis) (open ? lenis.stop() : lenis.start());
    if (open) { const first = $('a', menu); if (first) setTimeout(() => first.focus(), 300); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { closeMenu(); burger.focus(); } });

  // -------------------------------------------------------------------------
  // Cursor + magnetic buttons
  // -------------------------------------------------------------------------
  if (finePointer && !reduceMotion) {
    const cursor = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring');
    const pos = { x: innerWidth / 2, y: innerHeight / 2 };
    const rp = { ...pos };
    window.addEventListener('pointermove', (e) => { pos.x = e.clientX; pos.y = e.clientY; }, { passive: true });
    gsap.ticker.add(() => {
      rp.x += (pos.x - rp.x) * 0.16; rp.y += (pos.y - rp.y) * 0.16;
      dot.style.transform = `translate3d(${pos.x}px,${pos.y}px,0) translate(-50%,-50%)`;
      ring.style.transform = `translate3d(${rp.x}px,${rp.y}px,0) translate(-50%,-50%)`;
    });
    document.addEventListener('pointerover', (e) => {
      cursor.classList.toggle('is-hover', !!e.target.closest('a, button, summary, label, input, textarea'));
    });
    $$('[data-magnetic]').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.3);
        yTo((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  // -------------------------------------------------------------------------
  // Budget currency switch: show one set, disable the other so it can't be
  // focused or submitted; keep the same position (e.g. 2nd range) on switch.
  // -------------------------------------------------------------------------
  const budget = $('[data-budget]');
  if (budget) {
    const sets = $$('.budget__set', budget);
    const apply = (cur) => {
      const prev = $('input[name="budget"]:checked', budget);
      const prevIdx = prev ? $$('input', prev.closest('.budget__set')).indexOf(prev) : 1;
      sets.forEach((set) => {
        const on = set.dataset.currency === cur;
        set.hidden = !on;
        $$('input', set).forEach((i, k) => { i.disabled = !on; if (on && k === prevIdx) i.checked = true; });
      });
    };
    $$('input[name="currency"]', budget).forEach((r) => r.addEventListener('change', () => apply(r.value)));
    apply('INR');
    // form.reset() restores the default ₹ radio; re-sync the visible set after it
    budget.closest('form').addEventListener('reset', () => setTimeout(() => apply('INR')));
  }

  // -------------------------------------------------------------------------
  // Contact form
  // -------------------------------------------------------------------------
  const form = $('#contactForm');
  const status = $('#formStatus');
  if (form) {
    const btnLabel = $('.btn__label', form);
    const clearErrors = () => {
      $$('[data-err]', form).forEach((s) => { s.textContent = ''; });
      $$('.fld', form).forEach((f) => f.classList.remove('has-error'));
      $$('[aria-invalid]', form).forEach((i) => i.removeAttribute('aria-invalid'));
      status.classList.remove('is-error');
      status.textContent = '';
    };
    const showErrors = (errors) => {
      let first = null;
      Object.entries(errors).forEach(([k, msg]) => {
        const slot = $(`[data-err="${k}"]`, form);
        if (slot) slot.textContent = msg;
        const input = form.elements[k];
        if (input && input.setAttribute) {
          input.setAttribute('aria-invalid', 'true');
          input.closest('.fld')?.classList.add('has-error');
          first = first || input;
        }
      });
      if (first) first.focus();
    };

    // ---- Cloudflare Turnstile: loaded only when the form comes near the screen
    const captchaEl = $('[data-turnstile]', form);
    let widgetId = null;
    const resetCaptcha = () => { if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId); };
    if (captchaEl) {
      window.onyxTurnstile = () => {
        widgetId = window.turnstile.render(captchaEl, { sitekey: captchaEl.dataset.sitekey, theme: 'dark', size: 'flexible' });
      };
      const load = () => {
        if (document.getElementById('cf-turnstile')) return;
        const sc = document.createElement('script');
        sc.id = 'cf-turnstile';
        sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onyxTurnstile';
        sc.async = true;
        document.head.appendChild(sc);
      };
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((en) => { if (en.some((x) => x.isIntersecting)) { load(); io.disconnect(); } }, { rootMargin: '600px' });
        io.observe(form);
      } else load();
      form.addEventListener('focusin', load, { once: true });
    }

    // ---- Thank-you dialog
    const thanks = $('#thanks');
    let returnFocus = null;
    function openThanks(name) {
      if (!thanks) return;
      $('[data-thanks-name]', thanks).textContent = name ? ', ' + name : '';
      returnFocus = document.activeElement;
      if (typeof thanks.showModal === 'function') thanks.showModal(); else thanks.setAttribute('open', '');
      if (lenis) lenis.stop();
      $('[data-thanks-close]', thanks).focus();
    }
    function closeThanks() {
      if (!thanks || !thanks.open) return;
      if (typeof thanks.close === 'function') thanks.close(); else thanks.removeAttribute('open');
    }
    if (thanks) {
      thanks.addEventListener('close', () => { if (lenis) lenis.start(); if (returnFocus) returnFocus.focus({ preventScroll: true }); });
      $$('[data-thanks-close]', thanks).forEach((b) => b.addEventListener('click', closeThanks));
      thanks.addEventListener('click', (e) => { if (e.target === thanks) closeThanks(); }); // backdrop click
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.consent = form.elements.consent.checked;

      const errors = {};
      if (!payload.name || payload.name.trim().length < 2) errors.name = 'Please tell us your name.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(payload.email || '')) errors.email = 'Please enter a valid email address.';
      if (!payload.message || payload.message.trim().length < 10) errors.message = 'Please add a few words about the project.';
      if (!payload.consent) errors.consent = 'Please confirm you are 18+ and accept the Privacy Policy so we can reply.';
      if (captchaEl && !payload['cf-turnstile-response']) errors.captcha = 'Please wait for the security check to finish.';
      if (Object.keys(errors).length) { showErrors(errors); return; }

      form.classList.add('is-sending');
      btnLabel.textContent = 'Sending…';
      try {
        const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          const firstName = (payload.name || '').trim().split(/\s+/)[0];
          form.reset();
          resetCaptcha();
          btnLabel.textContent = 'Send project enquiry';
          status.textContent = 'Thank you. Your enquiry was sent.';
          openThanks(firstName);
        } else {
          if (data.errors) showErrors(data.errors);
          resetCaptcha();
          status.classList.add('is-error');
          status.textContent = data.error || 'Please check the highlighted fields.';
          btnLabel.textContent = 'Send project enquiry';
        }
      } catch {
        status.classList.add('is-error');
        status.textContent = 'Network error. Please email us directly instead.';
        btnLabel.textContent = 'Send project enquiry';
      } finally {
        form.classList.remove('is-sending');
      }
    });
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
