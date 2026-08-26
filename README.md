# ONYX — Precision-Built Digital Experiences

A production-ready single-page marketing site for **ONYX**, a next-gen digital
studio led by Suryanshu (CEO & Founder). Dark, cinematic, premium — built with
Express + EJS, GSAP scroll animations, and a working contact form.

> _"We build brands that lead."_

---

## Stack

- **Backend:** Node.js + Express
- **Views:** EJS with partials (`nav`, `footer`, `preloader`)
- **Styling:** Vanilla CSS with custom properties (`main`, `sections`, `animations`)
- **Motion:** GSAP + ScrollTrigger, Lenis smooth scroll (via CDN)
- **Forms:** `fetch()` → Express `/contact` → validated → saved to `data/inquiries.json`
- **Fonts:** Space Grotesk (display) + Inter (body) via Google Fonts

## Getting started

```bash
npm install
npm run dev      # nodemon, live reload
# or
npm start        # plain node
```

Then open **http://localhost:3000**.

## Scripts

| Script          | Description                          |
| --------------- | ------------------------------------ |
| `npm run dev`   | Start with nodemon (development)     |
| `npm start`     | Start with node (production)         |

## Environment

Copy the provided `.env` and adjust as needed:

```
PORT=3000
NODE_ENV=development
SITE_URL=http://localhost:3000
CONTACT_EMAIL=hello@onyx.studio
```

## Project structure

```
onyx-website/
  server.js            # Express app + /contact route
  data/inquiries.json  # Submitted inquiries (gitignored)
  views/
    partials/          # nav, footer, preloader
    index.ejs          # the full single-page site
    legal.ejs          # privacy / terms placeholder
  public/
    css/               # main, sections, animations
    js/                # preloader, main, gsap-init, form
    images/            # placeholder SVG assets
    favicon.svg / .ico
    robots.txt / sitemap.xml
```

## Sections

Cookie banner · Preloader · Sticky nav + overlay menu · Hero · Philosophy ·
Marquee · Showreel · Stats · About/Core · Services · Process · CTA · Selected
Work (with lightbox) · Testimonials · FAQ · Contact form · Footer.

## Contact form

`POST /contact` accepts JSON, validates name + email server-side, and appends a
record to `data/inquiries.json`. Responses are JSON `{ ok, message, errors? }`
and rendered inline without a page reload.

## Replacing placeholders

- **Work projects** — swap the SVGs in `public/images/work-0*.svg` and edit the
  `projects` array in `views/index.ejs`.
- **Showreel** — replace the `.reel__frame` block with a real `<video>` or embed.
- **Testimonials** — edit the `quotes` array in `views/index.ejs`.
- **Social links** — update the URLs in `partials/nav.ejs` and `partials/footer.ejs`.

## Accessibility & performance

- Semantic HTML5 landmarks, ARIA on interactive widgets
- `prefers-reduced-motion` disables GSAP, marquee, and the preloader
- Lazy-loaded images, deferred scripts, graceful no-JS fallback
- `robots.txt`, `sitemap.xml`, Open Graph + Twitter cards, JSON-LD

---

© 2024 ONYX. All Rights Reserved.
