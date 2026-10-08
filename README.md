# ONYX — Agency Website

Animated agency site for **ONYX**, inspired by byotone.com's scroll-driven style.

**Stack:** Node.js (Express + EJS) · GSAP + ScrollTrigger · Lenis smooth scroll · Three.js particle field

## What's inside

| Chapter | Section | Scroll effect |
|---|---|---|
| A | Hero | Giant type rises in; the particle **galaxy** swirls |
| B | Manifesto | Words light up one by one as you scroll; field becomes a **sphere** |
| C | Services | Sticky title + accordion list; field becomes a **DNA helix** |
| D | Work | Pinned **horizontal** project rail; field becomes a **wave** |
| E | Process | Timeline line draws itself; field becomes a **torus** |
| F | Proof | Inverted **light panel** (colour contrast beat) with count-up stats |
| G | FAQ | Accordion; field becomes a **ring** |
| H | Contact | Brief form (saved server-side); particles spell **ONYX** |

Also included: a preloader with scrambling text, lettered chapter navigation, a live HUD (scroll velocity, progress, IST clock), a custom cursor, magnetic buttons, a mobile menu, and reduced-motion support.

## Run locally

```bash
npm install
npm start          # http://localhost:3000
```

## Deploy to Hostinger (Node.js hosting)

1. In hPanel open **Websites → your site → Node.js** (available on Business / Cloud plans or a VPS).
2. Upload this folder (without `node_modules`), either as a zip in File Manager or through Git.
3. Set:
   - **Entry file:** `server.js`
   - **Node version:** 18 or newer
   - **Environment variables:** copy from `.env.example` (`SITE_URL`, `CONTACT_EMAIL`, optional `BOOKING_URL`)
4. Click **Install** (runs `npm install`), then **Start**.

The app listens on `process.env.PORT`, which Hostinger sets for you.

**On a Hostinger VPS instead:** `npm install --omit=dev`, then `npx pm2 start server.js --name onyx` and point Nginx at port 3000.

## Contact form

Briefs are saved to `data/inquiries.json`. `GET /health` returns `{ ok: true }` for uptime checks.

## Customise

- Copy and contact details: `views/index.ejs`
- Colours and fonts: the `:root` tokens at the top of `public/css/style.css` (the accent is `--volt`)
- Particle shapes: `public/js/field.js` (each `data-shape="n"` on a section picks shape *n*)
- Replace `yourdomain.com` in `public/sitemap.xml`
