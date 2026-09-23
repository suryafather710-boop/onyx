/* ONYX — main.js
   Core interactivity: nav, mobile menu, clock, cookies, FAQ, testimonials,
   work lightbox, smooth scrolling (Lenis), and anchor navigation. */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.documentElement.classList.remove('no-js');

  /* ---------------------------------------------------- Lenis smooth scroll */
  let lenis = null;
  function initLenis() {
    if (reduceMotion || typeof window.Lenis === 'undefined') return;
    // lerp-based smoothing feels far more responsive on a mouse wheel than a
    // long fixed duration (1.1s made each notch glide slowly, like it lagged).
    lenis = new window.Lenis({
      lerp: 0.12,
      smoothWheel: true,
      wheelMultiplier: 1.1,
      touchMultiplier: 1.6
    });

    // Keep ScrollTrigger in sync, and — critically — drive Lenis from GSAP's
    // single ticker instead of a separate requestAnimationFrame loop. Two loops
    // desync scroll position from ScrollTrigger updates, which shows up as
    // jitter/lag on scrubbed and pinned sections. One loop fixes that.
    if (window.gsap && window.ScrollTrigger) {
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add((time) => {
        lenis.raf(time * 1000); // ticker time is seconds; Lenis wants ms
      });
      window.gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => {
        lenis.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    }

    window.onyxLenis = lenis;
  }

  // Hero is above the fold, so its reveals must not depend on scroll position
  // (the CTA sits below GSAP's trigger line and would never fire otherwise).
  function revealHero() {
    document.querySelectorAll('#home .reveal').forEach((el) => el.classList.add('is-visible'));
  }

  function scrollToTarget(target) {
    if (!target) return;
    if (lenis) {
      lenis.scrollTo(target, { offset: -10 });
    } else {
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }

  /* ---------------------------------------------------- anchor navigation */
  document.querySelectorAll('[data-scroll]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      scrollToTarget(target);
    });
  });

  /* ---------------------------------------------------- nav scroll state */
  const nav = document.getElementById('nav');
  function onScroll() {
    if (!nav) return;
    nav.classList.toggle('is-scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------- mobile menu */
  const toggle = document.getElementById('navToggle');
  const overlay = document.getElementById('navOverlay');
  const menuClose = document.getElementById('menuClose');
  const menuLinks = overlay ? overlay.querySelectorAll('.menu__link') : [];

  menuLinks.forEach((link, i) => link.style.setProperty('--i', i));

  function openMenu() {
    if (!overlay) return;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    nav.classList.add('is-menu-open');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('is-locked');
    if (lenis) lenis.stop();
  }

  function closeMenu() {
    if (!overlay || !overlay.classList.contains('is-open')) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    nav.classList.remove('is-menu-open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-locked');
    if (lenis) lenis.start();
  }

  if (toggle) {
    toggle.addEventListener('click', () => {
      overlay.classList.contains('is-open') ? closeMenu() : openMenu();
    });
  }
  if (menuClose) menuClose.addEventListener('click', closeMenu);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMenu();
      closeLightbox();
    }
  });

  /* ---------------------------------------------------- hero video */
  const heroVideo = document.getElementById('heroVideo');
  if (heroVideo) {
    if (reduceMotion) {
      // Respect reduced-motion: don't autoplay background motion.
      heroVideo.removeAttribute('autoplay');
      heroVideo.pause();
    } else {
      // Some browsers need an explicit play() call after load.
      const tryPlay = () => {
        const p = heroVideo.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      };
      tryPlay();
      heroVideo.addEventListener('canplay', tryPlay, { once: true });
    }
  }

  /* ---------------------------------------------------- clock (India / IST) */
  const clockEl = document.getElementById('navClock');
  function updateClock() {
    if (!clockEl) return;
    const now = new Date();
    // Force IST regardless of visitor timezone.
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now);
    clockEl.textContent = parts;
  }
  updateClock();
  setInterval(updateClock, 15000);

  /* ---------------------------------------------------- cookie banner */
  const cookie = document.getElementById('cookie');
  const cookieAccept = document.getElementById('cookieAccept');
  const cookieDecline = document.getElementById('cookieDecline');

  function showCookie() {
    if (!cookie) return;
    if (localStorage.getItem('onyx_cookie_choice')) return;
    cookie.hidden = false;
  }
  function setCookieChoice(choice) {
    try {
      localStorage.setItem('onyx_cookie_choice', choice);
    } catch (e) {
      /* storage may be blocked; ignore */
    }
    if (cookie) cookie.hidden = true;
  }
  if (cookieAccept) cookieAccept.addEventListener('click', () => setCookieChoice('accepted'));
  if (cookieDecline) cookieDecline.addEventListener('click', () => setCookieChoice('declined'));
  // Delay slightly so it doesn't fight the preloader.
  setTimeout(showCookie, 1400);

  /* FAQ (tabs + accordion) is handled in faq.js. */

  /* ---------------------------------------------------- work lightbox */
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightboxImg');
  const lbTitle = document.getElementById('lightboxTitle');
  const lbTag = document.getElementById('lightboxTag');
  const lbDesc = document.getElementById('lightboxDesc');
  const lbClose = document.getElementById('lightboxClose');

  function openLightbox(card) {
    if (!lightbox) return;
    if (lbImg) {
      lbImg.src = card.dataset.img || '';
      lbImg.alt = (card.dataset.title || '') + ' preview';
    }
    if (lbTitle) lbTitle.textContent = card.dataset.title || '';
    if (lbTag) lbTag.textContent = card.dataset.tag || '';
    if (lbDesc) lbDesc.textContent = card.dataset.desc || '';
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    if (lenis) lenis.stop();
    if (lbClose) lbClose.focus();
  }

  function closeLightbox() {
    if (!lightbox || !lightbox.classList.contains('is-open')) return;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    if (lenis) lenis.start();
  }

  document.querySelectorAll('.work-card').forEach((card) => {
    card.addEventListener('click', () => openLightbox(card));
  });
  if (lbClose) lbClose.addEventListener('click', closeLightbox);
  lightbox &&
    lightbox.querySelectorAll('[data-lightbox-close]').forEach((el) =>
      el.addEventListener('click', closeLightbox)
    );

  // expose for keydown handler above
  window.closeLightbox = closeLightbox;

  /* ---------------------------------------------------- boot */
  // Init Lenis after preloader completes (or immediately if none).
  if (document.getElementById('preloader')) {
    document.addEventListener(
      'onyx:preloaded',
      () => {
        initLenis();
        revealHero();
      },
      { once: true }
    );
    // Fallback in case the event never fires.
    setTimeout(() => {
      if (!lenis) initLenis();
      revealHero();
    }, 4000);
  } else {
    initLenis();
    revealHero();
  }
})();
