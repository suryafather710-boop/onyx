/**
 * ONYX — Express server
 * Serves the site and stores contact briefs. Hostinger-ready: listens on
 * process.env.PORT and starts with `npm start`.
 */

require('dotenv').config();

const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const BUSINESS = require('./config/business');
const SEO = require('./config/seo');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Cloudflare Turnstile (form spam check). Active only when BOTH keys are set.
const TURNSTILE_SITE_KEY = (process.env.TURNSTILE_SITE_KEY || '').trim();
const TURNSTILE_SECRET = (process.env.TURNSTILE_SECRET_KEY || '').trim();
const TURNSTILE_ON = Boolean(TURNSTILE_SITE_KEY && TURNSTILE_SECRET);
const CF = 'https://challenges.cloudflare.com';

const DATA_DIR = path.join(__dirname, 'data');
const INQUIRIES_FILE = path.join(DATA_DIR, 'inquiries.json');

const SITE = {
  name: 'ONYX',
  tagline: 'Built for brands that lead.',
  description:
    'ONYX is a founder-led brand and web studio in India. Brand identity, websites and UI/UX for founders who want their brand to look as good as their product.',
  url: (process.env.SITE_URL || `http://localhost:${PORT}`).replace(/\/$/, ''),
  email: BUSINESS.email,
  bookingUrl: process.env.BOOKING_URL || '',
  founder: 'Suryanshu Bhattacharya',
  year: new Date().getFullYear()
};

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------
app.disable('x-powered-by');
// Trust exactly the proxy hops in front of the app (Hostinger = 1; Cloudflare in
// front of Hostinger = 2). Set TRUST_PROXY=0 if the app is exposed directly, so
// clients cannot spoof their IP with X-Forwarded-For to dodge the rate limit.
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(compression());
app.use(express.json({ limit: '20kb' }));

// Production: force HTTPS when the host's proxy reports a plain-HTTP request.
// Only acts on an explicit x-forwarded-proto header, so it can never loop.
if (NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.get('x-forwarded-proto') === 'http') {
      return res.redirect(301, 'https://' + req.get('host') + req.originalUrl);
    }
    if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
}

// One URL per page for search engines: /Privacy/ and /privacy/ 301 to /privacy.
// Only touches page-like paths (no file extension), keeps the query string.
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path === '/' || /\.[a-z0-9]+$/i.test(req.path)) return next();
  const clean = req.path.toLowerCase().replace(/\/+$/, '');
  if (clean !== req.path) {
    const qs = req.originalUrl.slice(req.path.length);
    return res.redirect(301, (clean || '/') + qs);
  }
  next();
});

// Security headers. Every asset is self-hosted, so the CSP allows only this origin.
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self'${TURNSTILE_ON ? ' ' + CF : ''}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; ` +
      `font-src 'self'; connect-src 'self'${TURNSTILE_ON ? ' ' + CF : ''}; frame-src ${TURNSTILE_ON ? CF : "'none'"}; ` +
      "object-src 'none'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'" +
      (NODE_ENV === 'production' ? '; upgrade-insecure-requests' : '')
  );
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

const cache = { maxAge: NODE_ENV === 'production' ? '7d' : 0 };
app.use(express.static(path.join(__dirname, 'public'), cache));

// Self-hosted libraries and fonts: no requests to Google or public CDNs.
const NM = path.join(__dirname, 'node_modules');
app.use('/vendor/gsap', express.static(path.join(NM, 'gsap', 'dist'), cache));
app.use('/vendor/lenis', express.static(path.join(NM, 'lenis', 'dist'), cache));
app.use('/vendor/three', express.static(path.join(NM, 'three', 'build'), cache));

const FONTS = {
  unbounded: [300, 400, 500, 700, 900],
  'inter-tight': [400, 500, 600],
  'jetbrains-mono': [400, 500]
};
Object.keys(FONTS).forEach((pkg) => {
  app.use(`/fonts/${pkg}`, express.static(path.join(NM, '@fontsource', pkg), cache));
});
// One stylesheet for all @font-face rules, file URLs rewritten to /fonts/…
const fontsCss = Object.entries(FONTS)
  .flatMap(([pkg, weights]) => weights.map((w) =>
    fs.readFileSync(path.join(NM, '@fontsource', pkg, `${w}.css`), 'utf-8')
      .replace(/url\(\.\/files\//g, `url(/fonts/${pkg}/files/`)))
  .join('\n');
app.get('/css/fonts.css', (req, res) => {
  res.type('text/css');
  if (NODE_ENV === 'production') res.setHeader('Cache-Control', 'public, max-age=604800');
  res.send(fontsCss);
});

app.locals.site = SITE;
// Cache-busting stamp: changes on every deploy/restart so browsers never
// keep stale CSS/JS for the 7-day cache window.
app.locals.v = Date.now().toString(36);
const BUILD_DATE = new Date().toISOString().slice(0, 10); // sitemap lastmod for the home page
app.use((req, res, next) => {
  res.locals.path = req.path === '/' ? '/' : req.path;
  res.locals.seo = SEO.pages[req.path] || null; // title, description, keywords
  next();
});
app.locals.faq = SEO.faq;

// ---------------------------------------------------------------------------
// Structured data (schema.org JSON-LD). Escaped so it can never break out of
// its <script> block.
// ---------------------------------------------------------------------------
const ldJson = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');
function orgNode() {
  const org = {
    '@type': ['Organization', 'ProfessionalService'],
    '@id': SITE.url + '/#org',
    name: 'ONYX',
    url: SITE.url + '/',
    logo: { '@type': 'ImageObject', url: SITE.url + '/icon-512.png', width: 512, height: 512 },
    image: SITE.url + '/images/og-cover.png',
    description: SITE.description,
    email: SITE.email,
    slogan: SITE.tagline,
    founder: { '@type': 'Person', name: SITE.founder },
    areaServed: [{ '@type': 'Country', name: 'India' }, 'Worldwide'],
    knowsAbout: ['Brand identity design', 'Logo design', 'Website design', 'Web development', 'UI/UX design', 'SEO'],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Design and development services',
      itemListElement: SEO.services.map((sv) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: sv.name, description: sv.description, provider: { '@id': SITE.url + '/#org' } }
      }))
    }
  };
  if (BUSINESS.legalName) org.legalName = BUSINESS.legalName;
  if (BUSINESS.phone) org.telephone = BUSINESS.phone;
  org.address = BUSINESS.address
    ? { '@type': 'PostalAddress', streetAddress: BUSINESS.address, addressCountry: 'IN' }
    : { '@type': 'PostalAddress', addressCountry: 'IN' };
  return org;
}
function homeSchema() {
  const meta = SEO.pages['/'];
  return ldJson({
    '@context': 'https://schema.org',
    '@graph': [
      orgNode(),
      { '@type': 'WebSite', '@id': SITE.url + '/#website', url: SITE.url + '/', name: 'ONYX', inLanguage: 'en', publisher: { '@id': SITE.url + '/#org' } },
      { '@type': 'WebPage', '@id': SITE.url + '/#webpage', url: SITE.url + '/', name: meta.title, description: meta.description,
        isPartOf: { '@id': SITE.url + '/#website' }, about: { '@id': SITE.url + '/#org' }, inLanguage: 'en' },
      { '@type': 'FAQPage', '@id': SITE.url + '/#faq',
        mainEntity: SEO.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }
    ]
  });
}
function legalSchema(slug, title) {
  const meta = SEO.pages['/' + slug];
  const url = SITE.url + '/' + slug;
  return ldJson({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': url + '#webpage', url, name: meta.title, description: meta.description,
        isPartOf: { '@type': 'WebSite', '@id': SITE.url + '/#website', url: SITE.url + '/', name: 'ONYX' },
        dateModified: BUSINESS.legalUpdatedISO, inLanguage: 'en' },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url + '/' },
        { '@type': 'ListItem', position: 2, name: title, item: url }
      ] }
    ]
  });
}
app.locals.biz = BUSINESS;
app.locals.turnstileKey = TURNSTILE_ON ? TURNSTILE_SITE_KEY : '';
app.locals.turnstileOn = TURNSTILE_ON;
// Legal pages show an obvious marker instead of silently blank details.
app.locals.need = (value, label) => value || `[ADD ${label.toUpperCase()}]`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ensureDataStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(INQUIRIES_FILE)) fs.writeFileSync(INQUIRIES_FILE, '[]', { encoding: 'utf-8', mode: 0o600 });
}

// Single-line fields lose ALL control characters (blocks email-header injection);
// the message keeps line breaks only.
const clean = (v, max) => (typeof v === 'string' ? v : '')
  .replace(/[\u0000-\u001F\u007F<>]/g, ' ').trim().slice(0, max);
const cleanText = (v, max) => (typeof v === 'string' ? v : '')
  .replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F<>]/g, ' ').trim().slice(0, max);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Tiny in-memory rate limiter: 5 submissions / 10 minutes / IP.
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
}
// Site-wide ceiling: even a botnet on many IPs gets at most 60 accepted posts / 10 min.
let globalHits = [];
function globallyLimited() {
  const now = Date.now();
  globalHits = globalHits.filter((t) => now - t < 10 * 60 * 1000);
  globalHits.push(now);
  return globalHits.length > 60;
}
const MAX_STORED = 5000; // refuse new writes rather than let the file grow without bound
// Forget IPs once their 10-minute window has passed (the privacy policy says so).
setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of hits) {
    const fresh = list.filter((t) => now - t < 10 * 60 * 1000);
    if (fresh.length) hits.set(ip, fresh); else hits.delete(ip);
  }
}, 60 * 1000).unref();

// Serialise reads/writes so concurrent submissions never clobber the file.
let writeQueue = Promise.resolve();
function mutateInquiries(fn) {
  writeQueue = writeQueue.then(async () => {
    ensureDataStore();
    let list = [];
    try {
      list = JSON.parse(await fsp.readFile(INQUIRIES_FILE, 'utf-8'));
      if (!Array.isArray(list)) list = [];
    } catch {
      list = [];
    }
    const next = fn(list);
    await fsp.writeFile(INQUIRIES_FILE, JSON.stringify(next, null, 2), { encoding: 'utf-8', mode: 0o600 });
  });
  return writeQueue;
}
const appendInquiry = (entry) => mutateInquiries((list) => {
  if (list.length >= MAX_STORED) throw Object.assign(new Error('store full'), { code: 'FULL' });
  return [...list, entry];
});

// Optional email alert for each new enquiry (set SMTP_* in .env).
const mailer = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    })
  : null;
function notifyInquiry(e) {
  if (!mailer) return;
  mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: process.env.NOTIFY_EMAIL || BUSINESS.email,
    replyTo: e.email,
    subject: `New ONYX enquiry — ${e.name} (${e.service || 'unspecified'})`,
    text: `Name: ${e.name}
Email: ${e.email}
Service: ${e.service}
Budget: ${e.budget}

${e.message}

Received ${e.createdAt}`
  }).catch((err) => console.error('[mail] notification failed:', err.message));
}

// Server-side Turnstile check. Fails closed on a bad/missing token; if Cloudflare
// itself is unreachable we let the request through (honeypot + rate limits still apply)
// rather than lose a genuine enquiry, and log it.
async function verifyTurnstile(token, ip) {
  if (!TURNSTILE_ON) return true;
  if (!token || typeof token !== 'string' || token.length > 2048) return false;
  try {
    const r = await fetch(CF + '/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: TURNSTILE_SECRET, response: token, remoteip: ip || '' }),
      signal: AbortSignal.timeout(5000)
    });
    const data = await r.json();
    return data.success === true;
  } catch (err) {
    console.error('[turnstile] verification unavailable, allowing request:', err.message);
    return true;
  }
}

// Retention: the privacy policy promises deletion after N months — enforce it.
function purgeOldInquiries() {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - BUSINESS.retentionMonths);
  return mutateInquiries((list) => list.filter((e) => new Date(e.createdAt) >= cutoff))
    .catch((err) => console.error('[retention] purge failed:', err));
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.get('/', (req, res) => res.render('index', { jsonld: homeSchema() }));
const LEGAL = {
  privacy: {
    title: 'Privacy Policy',
    description: "How ONYX collects, uses and protects the personal data you share through our website, and your rights under India's DPDP Act, 2023."
  },
  cookies: {
    title: 'Cookie Policy',
    description: 'ONYX sets no cookies of its own and runs no analytics or ad trackers. See the one preference we store and why there is no cookie banner.'
  },
  terms: {
    title: 'Terms & Conditions',
    description: 'Terms for using the ONYX website and our brand, web and UI/UX services: quotes, payments, revisions, ownership and liability.'
  },
  'refund-policy': {
    title: 'Refund & Cancellation Policy',
    description: 'When ONYX refunds project payments: cancelling before or after work starts, completed milestones, third-party costs and how to ask for a refund.'
  }
};
const legalNav = Object.fromEntries(Object.entries(LEGAL).map(([slug, d]) => [slug, d.title]));
Object.entries(LEGAL).forEach(([slug, d]) => {
  app.get('/' + slug, (req, res) =>
    res.render('legal', { doc: slug, title: d.title, legalPages: legalNav, jsonld: legalSchema(slug, d.title) }));
});

app.post('/api/contact', async (req, res) => {
  // Only our own page may post here: reject other origins and non-JSON bodies.
  const origin = req.get('origin');
  let originHost = null;
  try { originHost = origin ? new URL(origin).host : null; } catch { /* "null" or malformed */ }
  if (origin && originHost !== req.get('host')) {
    return res.status(403).json({ ok: false, error: 'Forbidden.' });
  }
  if (!req.is('application/json')) {
    return res.status(415).json({ ok: false, error: 'Unsupported request.' });
  }
  const body = req.body && typeof req.body === 'object' ? req.body : {};

  // Honeypot: bots fill hidden fields; pretend success.
  if (body.company_site) return res.json({ ok: true });

  if (rateLimited(req.ip) || globallyLimited()) {
    return res.status(429).json({ ok: false, error: 'Too many requests. Please try again later.' });
  }

  if (!(await verifyTurnstile(body['cf-turnstile-response'], req.ip))) {
    return res.status(400).json({ ok: false, errors: { captcha: 'Please complete the security check and send again.' } });
  }

  const entry = {
    name: clean(body.name, 80),
    email: clean(body.email, 120).toLowerCase(),
    service: clean(body.service, 60),
    budget: clean(body.budget, 40),
    message: cleanText(body.message, 2000),
    consent: body.consent === true || body.consent === 'on' || body.consent === 'true',
    consentVersion: BUSINESS.consentVersion,
    createdAt: new Date().toISOString()
  };

  const errors = {};
  if (entry.name.length < 2) errors.name = 'Tell us your name.';
  if (!EMAIL_RE.test(entry.email)) errors.email = 'Use a valid email.';
  if (entry.message.length < 10) errors.message = 'A few more words about the project, please.';
  if (!entry.consent) errors.consent = 'Please confirm you are 18+ and accept the Privacy Policy.';
  if (Object.keys(errors).length) return res.status(400).json({ ok: false, errors });

  try {
    await appendInquiry(entry);
    notifyInquiry(entry);
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'FULL') console.error('[contact] store full — enquiry refused; check data/inquiries.json');
    else console.error('[contact] failed to save inquiry:', err.message);
    res.status(500).json({ ok: false, error: 'Something broke on our side. Email us directly.' });
  }
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /health

Sitemap: ${SITE.url}/sitemap.xml
`);
});
app.get('/sitemap.xml', (req, res) => {
  const pages = ['/', ...Object.keys(LEGAL).map((s) => '/' + s)];
  const urls = pages
    .map((p) => {
      const lastmod = p === '/' ? BUILD_DATE : BUSINESS.legalUpdatedISO;
      const freq = p === '/' ? 'weekly' : 'yearly';
      return `  <url><loc>${SITE.url}${p}</loc><lastmod>${lastmod}</lastmod><changefreq>${freq}</changefreq><priority>${p === '/' ? '1.0' : '0.3'}</priority></url>`;
    })
    .join('\n');
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  );
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.use((req, res) => res.status(404).render('404', { legalPages: legalNav }));

// Never leak stack traces or internals (e.g. on malformed JSON).
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('[error]', err.message);
  if (req.path.startsWith('/api/')) return res.status(status).json({ ok: false, error: 'Request could not be processed.' });
  res.status(status).type('text/plain').send(status === 400 ? 'Bad request' : 'Something went wrong');
});

// ---------------------------------------------------------------------------
ensureDataStore();
purgeOldInquiries();
setInterval(purgeOldInquiries, 24 * 60 * 60 * 1000).unref();

const missing = [['LEGAL_NAME', BUSINESS.legalName], ['ENTITY_TYPE', BUSINESS.entityType],
  ['BUSINESS_ADDRESS', BUSINESS.address], ['JURISDICTION_CITY', BUSINESS.jurisdiction]]
  .filter(([, v]) => !v).map(([k]) => k);
if (NODE_ENV === 'production' && !process.env.SITE_URL) missing.push('SITE_URL (canonical links, sitemap and share previews will point at localhost)');
if (!process.env.CONTACT_EMAIL) missing.push('CONTACT_EMAIL (using placeholder suryafather@gmail.com)');
if (!TURNSTILE_ON) console.warn('[spam] TURNSTILE_* not set — form relies on honeypot + rate limits only.');
if (!mailer) console.warn('[mail] SMTP_* not set — enquiries are saved to data/inquiries.json only, no email alert.');
if (missing.length) {
  console.warn(`[legal] Missing business details (legal pages show [ADD …] markers): ${missing.join(', ')}`);
}

app.listen(PORT, () => {
  console.log(`ONYX running on http://localhost:${PORT} (${NODE_ENV})`);
});
