# Sponsor System v1

Sakhtanie uses validated, site-rendered sponsorships. The v1 inventory has 20
global placement IDs and one optional native Homepage Premium placement. These
are independently addressable positions, not 21 ads shown simultaneously to
one visitor.

## Architecture

Sponsor configuration is static, version controlled, and reviewed with the
application source. There is no sponsor CMS, database, admin panel, or runtime
third-party ad server in v1.

- `src/lib/sponsors.ts` owns the creative and security boundary through
  `sponsorSchema` and `defineSponsor()`. It also exports
  `homepagePrimarySponsor` and `HOMEPAGE_PREMIUM_PLACEMENT_ID` for the distinct
  native premium placement.
- `src/lib/sponsor-placements.ts` owns global placement IDs, campaign
  assignments, and fail-fast validation through
  `GLOBAL_SPONSOR_PLACEMENT_IDS`, `defineGlobalSponsorInventory()`, and
  `globalSponsorInventory`.
- Global UI resolves configuration through `getGlobalSponsorPlacements()` and
  `resolveGlobalSponsorPlacement()`. Page components must not reproduce this
  mapping logic.

A campaign contains a creative already validated by `sponsorSchema`. A
placement contains its canonical ID and a nullable `campaignId`. One approved
campaign may be assigned to more than one placement, but blanket assignment to
every placement is not the default policy.

## Placement IDs

Desktop global inventory (visible only when viewport rules allow):

- `desktop-left-1`
- `desktop-left-2`
- `desktop-left-3`
- `desktop-left-4`
- `desktop-left-5`
- `desktop-right-1`
- `desktop-right-2`
- `desktop-right-3`
- `desktop-right-4`
- `desktop-right-5`

Mobile global inventory:

- `mobile-top-1`
- `mobile-top-2`
- `mobile-top-3`
- `mobile-top-4`
- `mobile-top-5`
- `mobile-bottom-1`
- `mobile-bottom-2`
- `mobile-bottom-3`
- `mobile-bottom-4`
- `mobile-bottom-5`

Premium native inventory:

- `homepage-primary`: one optional native premium placement on the homepage.

## Responsive rules

- Desktop at `>=1700px`: fixed left and right rails are eligible. At viewport
  height `>=812px`, five placements per rail are eligible; at `656–811px`, four
  per rail are eligible; at `<656px`, the rails are absent.
- Tablet and narrow desktop at `768–1699px`: no global sponsor chrome is shown,
  so normal content is never squeezed by advertising inventory.
- Mobile at `<768px`: top and bottom bars are eligible. Desktop rails are not
  rendered at this width.

The native Homepage Premium placement is independent of these viewport-based
global surfaces and continues to follow its own homepage and monetization gate.

## Mobile behavior

Each active mobile surface renders one canonical, accessible sequence in
configured order and a visual duplicate sequence for a seamless CSS marquee.
Visual clones are `aria-hidden`, removed from sequential keyboard focus, and
excluded from impression observation. A clone click, when available, is still
attributed to the canonical placement ID.

The marquee pauses on hover and `:focus-within`. With
`prefers-reduced-motion: reduce`, animation stops, visual duplicates are hidden,
and canonical items remain available as a static horizontally scrollable list.

## Analytics

Global analytics use placement IDs, not campaign IDs:

```text
sponsor_impression
{ sponsor_id: placementId }

sponsor_click
{ sponsor_id: placementId }
```

Impressions are deduplicated once per placement per page at the 50 percent
visibility threshold. Marquee clones never emit impressions.

The native homepage placement uses the same sponsor event names with
`homepage-primary` as `sponsor_id`. When its inactive sales placeholder is
shown, the existing CTA event remains:

```text
advertise_cta_click
{ placement: "homepage-primary" }
```

Do not add sponsor copy, URLs, referrers, visitor IDs, timestamps, or arbitrary
campaign metadata to these payloads.

## Security

All creatives must pass the existing strict sponsor schema:

- destination URLs must use HTTPS and may not contain credentials;
- known URL-shortener hosts and their subdomains are rejected;
- images must be local `/sponsor-assets/` SVG, PNG, or WebP files;
- brand, title, description, CTA, and alt text remain length constrained;
- arbitrary HTML, presentation fields, scripts, tracking pixels, iframes, and
  external runtime JavaScript are forbidden;
- rendered destinations use `rel="sponsored noopener noreferrer"` and a new
  browsing context.

Do not weaken `sponsorSchema` or bypass `defineSponsor()` for an assignment.

## Campaign assignment

To assign a future approved campaign safely:

1. Review brand suitability, claims, destination behavior, and final copy.
2. Add the optimized local creative asset under `public/sponsor-assets/`.
3. In `globalSponsorInventory` inside `src/lib/sponsor-placements.ts`, add a
   campaign whose `sponsor` value was created through `defineSponsor()`.
4. Set `campaignId` only on the intended entries in the canonical `placements`
   array. Leave unsold placements as `null`; never generate arbitrary IDs.
5. Run the full verification checklist and inspect active desktop/mobile
   fixtures before release.

The native premium configuration remains `homepagePrimarySponsor` in
`src/lib/sponsors.ts`; it is not inserted into the 20-ID global inventory.

## Asset recommendations

- Store every asset locally in `public/sponsor-assets/`.
- Prefer a square creative with explicit intrinsic dimensions.
- Keep compact sponsor assets at or below 50 KB after optimization.
- Prefer sanitized SVG or WebP where appropriate; PNG remains supported.
- Never hotlink or preload sponsor media from an advertiser-controlled host.

## Empty inventory behavior

Unassigned or inactive global placements render no block, bar, landmark,
tracking target, or repeated “advertise here” placeholder. Partial inventory
preserves configured order without filling unsold positions. The optional
Homepage Premium placement may independently render its single native sales
placeholder while monetization is enabled. When monetization is disabled, no
sponsor UI or sponsor tracking is mounted.

## Editorial and density policy

- A sponsor cannot purchase or alter Sakhtanie verdicts, analysis text, scores,
  comparisons, or editorial conclusions.
- Every rendered sponsorship remains visibly disclosed.
- Do not automatically assign one campaign to every global placement.
- Avoid assigning the same campaign to Homepage Premium and many global
  placements unless that exposure is deliberately reviewed and sold.
- Empty global inventory remains visually absent.

## Verification checklist

Run all commands before activation or assignment changes:

```sh
npm test
npm run lint
npm run build
npm run validate:data
npm run scan:secrets
git diff --check
```

Also verify desktop height tiers, the tablet no-chrome range, mobile reduced
motion, secure link attributes, placement-level analytics, and homepage premium
behavior with monetization both enabled and disabled.
