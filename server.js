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
  'Web Development',
  'UI/UX Design',
  'Branding',
  'Growth & Automation',
  'Full Digital Setup',
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

// Placeholder legal pages so footer links resolve.
app.get('/privacy', (req, res) => {
  res.render('legal', {
    site: SITE,
    heading: 'Privacy Policy',
    body:
      'This is a placeholder privacy policy for ONYX. We respect your data and only use the information you submit through our contact form to respond to your inquiry. A full policy will be published soon.'
  });
});

app.get('/terms', (req, res) => {
  res.render('legal', {
    site: SITE,
    heading: 'Terms of Use',
    body:
      'This is a placeholder terms of use page for ONYX. By using this site you agree to engage with it in good faith. Full terms will be published soon.'
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

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        ok: false,
        message: 'Please fix the highlighted fields.',
        errors
      });
    }

    const record = {
      id: `onyx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...inquiry,
      submittedAt: new Date().toISOString(),
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || null
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
