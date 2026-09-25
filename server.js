/**
 * ONYX — Express server
 * Serves the single-page site and handles contact inquiries.
 */

require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const DATA_DIR = path.join(__dirname, 'data');
const INQUIRIES_FILE = path.join(DATA_DIR, 'inquiries.json');

// Site metadata shared with every view.
const SITE = {
  name: 'ONYX',
  tagline: 'We build brands that lead.',
  founderLine: 'Led by Suryanshu — founder at 17, obsessed with craft since day one.',
  url: process.env.SITE_URL || `http://localhost:${PORT}`,
  email: process.env.CONTACT_EMAIL || 'hello@onyx.studio',
  // Set BOOKING_URL to your Cal.com/Calendly link to make "Book a call" open it;
  // until then the button scrolls to the brief form.
  bookingUrl: process.env.BOOKING_URL || '',
  year: 2024
};

// ---------------------------------------------------------------------------
// View engine + middleware
// ---------------------------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: NODE_ENV === 'production' ? '7d' : 0
  })
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Ensure the data directory + inquiries file exist. */
function ensureDataStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(INQUIRIES_FILE)) {
    fs.writeFileSync(INQUIRIES_FILE, '[]', 'utf-8');
  }
}

/** Basic email shape check. */
function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Trim + cap a string field to avoid runaway payloads. */
function clean(value, max = 2000) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

const ALLOWED_SERVICES = [
  'Website Design & Development',
  'SEO',
  'Website + SEO',
  'Other'
];

const ALLOWED_BUDGETS = [
  'Under $1K',
  '$1K–$3K',
  '$3K–$5K',
  '$5K–$10K',
  '$10K+',
  'Not sure yet'
];

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get('/', (req, res) => {
  res.render('index', { site: SITE });
});

// Legal pages. Content lives in views/legal/<page>.ejs.
const LEGAL_UPDATED = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const LEGAL_PAGES = {
  privacy: 'Privacy Policy',
  terms: 'Terms & Conditions',
  cookies: 'Cookies Policy',
  refund: 'Refund Policy'
};
Object.entries(LEGAL_PAGES).forEach(([page, heading]) => {
  app.get('/' + page, (req, res) => {
    res.render('legal', { site: SITE, heading, updated: LEGAL_UPDATED, page });
  });
});

// Contact submission — validates and appends to the JSON store.
app.post('/contact', async (req, res) => {
  try {
    const body = req.body || {};

    const inquiry = {
      fullName: clean(body.fullName, 120),
      email: clean(body.email, 160),
      company: clean(body.company, 160),
      website: clean(body.website, 200),
      phone: clean(body.phone, 40),
      service: clean(body.service, 60),
      budget: clean(body.budget, 40),
      description: clean(body.description, 4000)
    };

    // Explicit consent is required before we store anything (DPDP: consent-based).
    const consent = body.consent === true || body.consent === 'on' || body.consent === 'true';

    const errors = {};
    if (!inquiry.fullName) errors.fullName = 'Please enter your name.';
    if (!inquiry.email) {
      errors.email = 'Please enter your email.';
    } else if (!isValidEmail(inquiry.email)) {
      errors.email = 'Please enter a valid email address.';
    }
    if (inquiry.service && !ALLOWED_SERVICES.includes(inquiry.service)) {
      errors.service = 'Please choose a valid service.';
    }
    if (inquiry.budget && !ALLOWED_BUDGETS.includes(inquiry.budget)) {
      errors.budget = 'Please choose a valid budget.';
    }
    if (!consent) {
      errors.consent = 'Please agree to the Privacy Policy so we can reply.';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        ok: false,
        message: 'Please fix the highlighted fields.',
        errors
      });
    }

    // Data minimisation: store only what's needed to respond, plus a consent
    // record. We do not store IP addresses or build any profile.
    const record = {
      id: `onyx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...inquiry,
      consent: true,
      submittedAt: new Date().toISOString()
    };

    ensureDataStore();
    let inquiries = [];
    try {
      const raw = await fsp.readFile(INQUIRIES_FILE, 'utf-8');
      inquiries = JSON.parse(raw || '[]');
      if (!Array.isArray(inquiries)) inquiries = [];
    } catch {
      inquiries = [];
    }

    inquiries.push(record);
    await fsp.writeFile(INQUIRIES_FILE, JSON.stringify(inquiries, null, 2), 'utf-8');

    return res.status(200).json({
      ok: true,
      message: "Dispatch received. We'll be in touch to set up your discovery call."
    });
  } catch (err) {
    console.error('[contact] error:', err);
    return res.status(500).json({
      ok: false,
      message: 'Something went wrong on our end. Please try again shortly.'
    });
  }
});

// 404 fallback -> home.
app.use((req, res) => {
  res.redirect('/');
});

ensureDataStore();
app.listen(PORT, () => {
  console.log(`\n  ONYX is live → ${SITE.url}  (${NODE_ENV})\n`);
});
