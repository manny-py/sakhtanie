# Advertising contract

Sakhtanie uses native, site-rendered sponsorships. Advertisers provide approved
copy and brand assets; `SponsorSlot.astro` owns the final markup, disclosure,
layout, responsive behavior, accessibility, and CTA presentation.

## Placements

- `homepage-primary`: Featured Sponsor, immediately after homepage search.
- `homepage-secondary`: Discovery Sponsor, after the featured-tools section.

These are the only standard placements currently implemented.

## Sponsor fields

Sponsor definitions are created with `defineSponsor()` in
`src/lib/sponsors.ts` and validated before rendering.

| Field | Contract |
| --- | --- |
| `id` | Required safe lowercase identifier; maximum 80 characters |
| `brand` | Required when active; maximum 40 characters |
| `title` | Required when active; maximum 70 characters |
| `description` | Required when active; maximum 160 characters |
| `href` | Required when active; approved HTTPS destination only |
| `active` | Controls whether sponsor content or the placeholder renders |
| `logoSrc` | Optional local `/sponsor-assets/` SVG, PNG, or WebP path |
| `logoAlt` | Optional accessible logo description; requires `logoSrc` |
| `ctaLabel` | Optional approved CTA; maximum 20 characters |

Inactive placeholder definitions may keep the display fields empty. Active
definitions must pass the complete schema. Do not truncate invalid copy during
rendering.

No sponsor field may contain arbitrary HTML, CSS, class names, colors, scripts,
iframes, tracking pixels, or remote asset URLs. Keep optimized approved logos
in `public/sponsor-assets/`; aim for 200 KB or less.

## Privacy and activation

Sponsor analytics remain limited to `sponsor_impression` and `sponsor_click`
with `{ sponsor_id }`. Never send sponsor copy, destination or asset URLs, page
URLs, referrers, visitor/session identifiers, browser timestamps, or arbitrary
metadata.

Before activation:

1. Review brand suitability, claims, final copy, and destination behavior.
2. Optimize and store approved logo assets locally.
3. Add the definition through `defineSponsor()` and keep the fixed `SPONSORED`
   disclosure unchanged.
4. Run sponsor tests, data validation, secret scanning, linting, and a full
   production build.
5. Review both desktop and mobile rendering before release.
