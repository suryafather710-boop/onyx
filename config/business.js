/**
 * ONYX — business + legal details used by the legal pages and footer.
 *
 * Fill these in via .env (preferred) or edit the defaults here.
 * Anything left empty renders as a visible "[ADD …]" marker on the legal
 * pages and is listed in a warning when the server starts — nothing ships
 * silently blank, and nothing is made up.
 *
 * The commercial terms below (deposit, revisions, refund windows) are
 * business decisions. They are common starting points, not legal advice:
 * confirm them before launch.
 */

const env = (k, d = '') => (process.env[k] || d).trim();

module.exports = {
  tradingName: 'ONYX',
  // e.g. "Suryanshu Bhattacharya, sole proprietor trading as ONYX" or "Onyx Studio LLP"
  legalName: env('LEGAL_NAME'),
  // e.g. "Sole proprietorship", "LLP", "Private limited company"
  entityType: env('ENTITY_TYPE'),
  // Full postal address for legal notices
  address: env('BUSINESS_ADDRESS'),
  // City whose courts have jurisdiction, e.g. "Kolkata, West Bengal"
  jurisdiction: env('JURISDICTION_CITY'),
  // Optional: shown only when set
  phone: env('BUSINESS_PHONE'),
  gstin: env('GSTIN'),
  cin: env('CIN'), // CIN / LLPIN, if incorporated
  email: env('CONTACT_EMAIL', 'suryafather@gmail.com'),

  // Person who answers privacy / data-protection requests (DPDP Act 2023)
  privacyContact: env('PRIVACY_CONTACT_NAME', 'Suryanshu Bhattacharya'),
  privacyEmail: env('PRIVACY_EMAIL') || env('CONTACT_EMAIL', 'suryafather@gmail.com'),

  // Enquiries older than this are deleted automatically by the server.
  retentionMonths: 12,

  // Commercial terms — CONFIRM before launch
  terms: {
    depositPercent: 50,  // advance before work starts
    revisionRounds: 2,   // included revision rounds per design phase
    invoiceDueDays: 7,   // days to pay an invoice
    coolingOffDays: 7,   // full refund of the advance if cancelled within N days AND before work starts
    supportDays: 30      // free bug-fix support after launch
  },

  // Update when you change any legal page.
  legalUpdated: '7 October 2026',
  legalUpdatedISO: '2026-10-07', // same date, for the sitemap
  // Bump when the form consent wording changes; stored with each enquiry.
  consentVersion: '2026-10-02'
};
