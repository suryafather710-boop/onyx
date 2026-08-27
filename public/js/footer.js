/* ONYX — footer.js
   Cinematic footer behaviour: magnetic pills, GSAP scroll reveal of the giant
   wordmark + content, and back-to-top. Degrades gracefully. */
(function () {
  'use strict';

  const wrapper = document.getElementById('footerReveal');
  if (!wrapper) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const giant = document.getElementById('footerGiant');
  const heading = document.getElementById('footerHeading');
  const links = document.getElementById('footerLinks');

  /* ---------------------------------------------------- back to top */
  const topBtn = document.getElementById('footerTop');
  if (topBtn) {
    topBtn.addEventListener('click', () => {
      if (window.onyxLenis && window.onyxLenis.scrollTo) {
        window.onyxLenis.scrollTo(0);
      } else {
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      }
    });
  }

  const hasGsap =
    typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  // No GSAP or reduced motion: make sure everything is simply visible.
  if (!hasGsap || reduce) {
    [giant, heading, links].forEach((el) => {
      if (!el) return;
      el.style.opacity = '1';
    });
    return;
  }

  window.gsap.registerPlugin(window.ScrollTrigger);

  // Giant wordmark parallax.
  if (giant) {
    window.gsap.fromTo(
      giant,
      { yPercent: 12, scale: 0.85, opacity: 0 },
      {
        yPercent: 0,
        scale: 1,
        opacity: 1,
        ease: 'power1.out',
        scrollTrigger: { trigger: wrapper, start: 'top 80%', end: 'bottom bottom', scrub: 1 }
      }
    );
  }

  // Staggered content reveal.
  const revealTargets = [heading, links].filter(Boolean);
  if (revealTargets.length) {
    window.gsap.fromTo(
      revealTargets,
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: { trigger: wrapper, start: 'top 40%', end: 'bottom bottom', scrub: 1 }
      }
    );
  }

  /* ---------------------------------------------------- magnetic pills */
  wrapper.querySelectorAll('.magnetic').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      window.gsap.to(el, {
        x: x * 0.4,
        y: y * 0.4,
        rotationX: -y * 0.15,
        rotationY: x * 0.15,
        scale: 1.05,
        transformPerspective: 600,
        ease: 'power2.out',
        duration: 0.4
      });
    });
    el.addEventListener('mouseleave', () => {
      window.gsap.to(el, {
        x: 0,
        y: 0,
        rotationX: 0,
        rotationY: 0,
        scale: 1,
        ease: 'elastic.out(1, 0.3)',
        duration: 1.2
      });
    });
  });
})();
