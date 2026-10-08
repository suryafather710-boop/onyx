/**
 * ONYX — SEO: one place for every page's target keyword, title, description
 * and the FAQ (shown on the page AND sent to Google as FAQPage schema, so the
 * two can never drift apart).
 *
 * Rules of thumb used here:
 *  - title ≤ 60 chars, primary keyword first, brand last
 *  - description ≤ 160 chars, keyword in the first sentence, one clear benefit
 *  - one H1 per page that contains the primary keyword
 */

module.exports = {
  pages: {
    '/': {
      keyword: 'brand identity and website design studio in India',
      title: 'Brand Identity & Website Design Studio in India | ONYX',
      h1: 'Brand identity & website design studio · India',
      description:
        'ONYX is a founder-led brand identity and website design studio in India. Logos, websites, UI/UX and SEO for brands that lead. Live in 2–3 weeks.',
      keywords: [
        'brand identity design', 'website design agency India', 'web design studio India',
        'UI/UX design', 'logo design', 'SEO services', 'luxury website design', 'ONYX studio'
      ]
    },
    '/privacy': {
      keyword: 'ONYX privacy policy',
      title: 'Privacy Policy | ONYX Brand & Web Design Studio',
      description:
        "How ONYX collects, uses and protects the personal data you share through our website, and your rights under India's DPDP Act, 2023.",
      keywords: ['ONYX privacy policy', 'DPDP Act 2023', 'personal data protection India', 'data rights']
    },
    '/cookies': {
      keyword: 'ONYX cookie policy',
      title: 'Cookie Policy | ONYX Brand & Web Design Studio',
      description:
        'ONYX sets no cookies of its own and runs no analytics or ad trackers. See the one preference we store and why there is no cookie banner.',
      keywords: ['ONYX cookie policy', 'no tracking cookies', 'cookie-free website', 'privacy-friendly website']
    },
    '/terms': {
      keyword: 'web design terms and conditions',
      title: 'Terms & Conditions | ONYX Web Design Services',
      description:
        'Terms for using the ONYX website and our brand, web and UI/UX services: quotes, payments, revisions, ownership and liability.',
      keywords: ['web design terms and conditions', 'ONYX terms', 'website project payment terms', 'design revisions policy']
    },
    '/refund-policy': {
      keyword: 'web design refund policy',
      title: 'Refund & Cancellation Policy | ONYX Web Design',
      description:
        'When ONYX refunds project payments: cancelling before or after work starts, completed milestones, third-party costs and how to ask for a refund.',
      keywords: ['web design refund policy India', 'project cancellation policy', 'ONYX refund policy']
    }
  },

  // Services, used for the Service / OfferCatalog schema on the home page
  services: [
    { name: 'Brand identity design', description: 'Naming, logo systems, typography, colour and brand voice.' },
    { name: 'Website design and development', description: 'Animated, fast, hand-built websites with a CMS where needed.' },
    { name: 'UI/UX design', description: 'Research-led interfaces and design systems for apps and SaaS.' },
    { name: 'SEO and growth', description: 'Technical SEO, content and conversion improvements.' }
  ],

  faq: [
    { q: 'How long does a website take?',
      a: 'Most brand + website projects take 2–3 weeks, and a focused landing page is usually quicker. You get a written timeline before we start.' },
    { q: 'What does a project cost?',
      a: 'Every project is scoped to your goals. After a first call we send a fixed quote, so there are no hourly surprises. We can quote in ₹ or $.' },
    { q: 'Can I edit the site myself afterwards?',
      a: 'Yes. We can add a CMS for the content you update often, and hand over a short walkthrough for everything else.' },
    { q: 'Do you work with clients outside India?',
      a: 'Yes. We work remotely, with written updates and a weekly call at a time that suits both time zones.' },
    { q: 'Will the animations slow my site down?',
      a: "Motion is budgeted like any other feature: we test on mid-range phones, keep heavy effects optional, and respect the reduced-motion setting on your visitors' devices." },
    { q: 'What happens after launch?',
      a: 'Launch includes a period of bug-fix support, and optional monthly care plans cover updates, SEO and new pages.' }
  ]
};
