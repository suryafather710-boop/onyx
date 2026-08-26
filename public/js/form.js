/* ONYX — form.js
   Client-side validation + fetch submission to /contact (no page reload). */
(function () {
  'use strict';

  const form = document.getElementById('contactForm');
  if (!form) return;

  const submitBtn = document.getElementById('contactSubmit');
  const statusEl = document.getElementById('contactStatus');

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function setFieldError(name, message) {
    const errorEl = form.querySelector(`[data-error-for="${name}"]`);
    const field = form.querySelector(`[name="${name}"]`);
    if (errorEl) errorEl.textContent = message || '';
    if (field && field.closest('.field')) {
      field.closest('.field').classList.toggle('has-error', !!message);
    }
  }

  function clearErrors() {
    form.querySelectorAll('.field__error').forEach((el) => (el.textContent = ''));
    form.querySelectorAll('.field.has-error').forEach((el) => el.classList.remove('has-error'));
  }

  function setStatus(message, type) {
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.classList.remove('is-success', 'is-error');
    if (type) statusEl.classList.add(type === 'success' ? 'is-success' : 'is-error');
  }

  function validate(data) {
    const errors = {};
    if (!data.fullName) errors.fullName = 'Please enter your name.';
    if (!data.email) {
      errors.email = 'Please enter your email.';
    } else if (!isValidEmail(data.email)) {
      errors.email = 'Please enter a valid email address.';
    }
    return errors;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();
    setStatus('', null);

    const data = Object.fromEntries(new FormData(form).entries());

    const errors = validate(data);
    if (Object.keys(errors).length) {
      Object.entries(errors).forEach(([name, msg]) => setFieldError(name, msg));
      setStatus('Please fix the highlighted fields.', 'error');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.dataset.label = submitBtn.innerHTML;
      submitBtn.innerHTML = 'Sending…';
    }

    try {
      const res = await fetch('/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();

      if (res.ok && result.ok) {
        form.reset();
        setStatus(result.message || 'Dispatch received.', 'success');
      } else {
        if (result.errors) {
          Object.entries(result.errors).forEach(([name, msg]) => setFieldError(name, msg));
        }
        setStatus(result.message || 'Something went wrong. Please try again.', 'error');
      }
    } catch (err) {
      setStatus('Network error. Please check your connection and try again.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        if (submitBtn.dataset.label) submitBtn.innerHTML = submitBtn.dataset.label;
      }
    }
  });
})();
