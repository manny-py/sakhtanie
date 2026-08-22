import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sponsorBlockSource = readFileSync(
  new URL("../src/components/sponsor/SponsorBlock.astro", import.meta.url),
  "utf8",
);
const trackingClientSource = readFileSync(
  new URL("../src/components/sponsor/SponsorTrackingClient.astro", import.meta.url),
  "utf8",
);
const desktopRailsSource = readFileSync(
  new URL("../src/components/sponsor/DesktopSponsorRails.astro", import.meta.url),
  "utf8",
);
const globalChromeSource = readFileSync(
  new URL("../src/components/sponsor/GlobalSponsorChrome.astro", import.meta.url),
  "utf8",
);
const pageShellSource = readFileSync(
  new URL("../src/components/layout/PageShell.astro", import.meta.url),
  "utf8",
);

test("SponsorBlock uses the resolved placement ID and secure sponsor-link attributes", () => {
  assert.match(sponsorBlockSource, /data-sponsor-id=\{placement\.placement\.id\}/);
  assert.match(sponsorBlockSource, /target="_blank"/);
  assert.match(sponsorBlockSource, /rel="sponsored noopener noreferrer"/);
  assert.match(sponsorBlockSource, /href=\{sponsor\.href\}/);
});

test("SponsorBlock renders only active resolved campaigns without sales placeholders", () => {
  assert.match(sponsorBlockSource, /placement\.active && sponsor !== null/);
  assert.match(sponsorBlockSource, /isActive && sponsor/);
  assert.doesNotMatch(sponsorBlockSource, /تبلیغات شما/);
  assert.doesNotMatch(sponsorBlockSource, /data-advertise-cta/);
});

test("SponsorBlock clone mode is hidden from accessibility and impression observation", () => {
  assert.match(sponsorBlockSource, /aria-hidden=\{clone \? "true" : undefined\}/);
  assert.match(sponsorBlockSource, /tabindex=\{clone \? "-1" : undefined\}/);
  assert.match(sponsorBlockSource, /data-sponsor-impression=\{clone \? undefined : "true"\}/);
  assert.match(sponsorBlockSource, /data-sponsor-clone=\{clone \? "true" : undefined\}/);
});

test("SponsorBlock keeps local sponsor images dimensioned and deferred", () => {
  assert.match(sponsorBlockSource, /width="40"/);
  assert.match(sponsorBlockSource, /height="40"/);
  assert.match(sponsorBlockSource, /loading="lazy"/);
  assert.match(sponsorBlockSource, /decoding="async"/);
});

test("global sponsor tracking initializes once and deduplicates impressions by placement ID", () => {
  assert.match(trackingClientSource, /__sakhtanieGlobalSponsorTrackingState/);
  assert.match(trackingClientSource, /if \(!existingState\?\.initialized\)/);
  assert.match(trackingClientSource, /impressions: new Set<string>\(\)/);
  assert.match(trackingClientSource, /state\.impressions\.has\(sponsorId\)/);
  assert.match(trackingClientSource, /state\.impressions\.add\(sponsorId\)/);
});

test("global sponsor tracking observes canonical blocks at the existing 50 percent threshold", () => {
  assert.match(
    trackingClientSource,
    /\[data-global-sponsor-slot\]\[data-sponsor-impression="true"\]/,
  );
  assert.match(trackingClientSource, /entry\.intersectionRatio < 0\.5/);
  assert.match(trackingClientSource, /threshold: \[0\.5\]/);
  assert.match(trackingClientSource, /observer\.unobserve\(entry\.target\)/);
});

test("global sponsor tracking delegates clicks and attributes both canonical and clone links", () => {
  assert.match(trackingClientSource, /document\.addEventListener\("click"/);
  assert.match(trackingClientSource, /closest<HTMLElement>\("\[data-global-sponsor-link\]"\)/);
  assert.match(trackingClientSource, /closest<HTMLElement>\("\[data-global-sponsor-slot\]"\)/);
  assert.match(trackingClientSource, /track\("sponsor_click", \{ sponsor_id: sponsorId \}\)/);
});

test("global sponsor tracking preserves sponsor event names and placement-level payloads", () => {
  assert.match(trackingClientSource, /track\("sponsor_impression", \{ sponsor_id: sponsorId \}\)/);
  assert.match(trackingClientSource, /track\("sponsor_click", \{ sponsor_id: sponsorId \}\)/);
});

test("desktop rails resolve the two canonical surfaces in deterministic placement order", () => {
  assert.match(desktopRailsSource, /activePlacements\("desktop-left"\)/);
  assert.match(desktopRailsSource, /activePlacements\("desktop-right"\)/);
  assert.match(desktopRailsSource, /getGlobalSponsorPlacements\(surface, inventory\)/);
  assert.match(desktopRailsSource, /resolveGlobalSponsorPlacement\(placement\.id, inventory\)/);
  assert.match(desktopRailsSource, /<SponsorBlock placement=\{placement\} \/>/);
});

test("desktop rails render no chrome without an active assignment", () => {
  assert.match(desktopRailsSource, /\.filter\(\(placement\) => placement\.active\)/);
  assert.match(desktopRailsSource, /hasActiveDesktopPlacement/);
  assert.match(desktopRailsSource, /MONETIZATION_ENABLED && hasActiveDesktopPlacement/);
  assert.doesNotMatch(desktopRailsSource, /تبلیغات شما/);
});

test("desktop rails activate only for safe wide and tall viewports", () => {
  assert.match(desktopRailsSource, /@media \(min-width: 1700px\) and \(min-height: 656px\)/);
  assert.match(
    desktopRailsSource,
    /@media \(min-width: 1700px\) and \(min-height: 656px\) and \(max-height: 811px\)/,
  );
  assert.match(desktopRailsSource, /desktop-sponsor-rail__slot--5[\s\S]*display: none/);
  assert.match(desktopRailsSource, /display: none;[\s\S]*position: fixed/);
});

test("desktop overlay preserves approved rail geometry without squeezing main content", () => {
  assert.match(desktopRailsSource, /position: fixed/);
  assert.match(desktopRailsSource, /pointer-events: none/);
  assert.match(desktopRailsSource, /var\(--sponsor-rail-width\)/);
  assert.match(desktopRailsSource, /minmax\(0, var\(--container-main\)\)/);
  assert.match(desktopRailsSource, /column-gap: var\(--layout-gap\)/);
  assert.match(desktopRailsSource, /repeat\(5, var\(--sponsor-block-size\)\)/);
  assert.match(desktopRailsSource, /gap: var\(--space-4\)/);
});

test("PageShell mounts global desktop chrome exactly once without changing landmark ownership", () => {
  assert.equal((pageShellSource.match(/<GlobalSponsorChrome \/>/g) ?? []).length, 1);
  assert.equal((pageShellSource.match(/<main/g) ?? []).length, 1);
  assert.equal((pageShellSource.match(/<Header \/>/g) ?? []).length, 1);
  assert.equal((pageShellSource.match(/<Footer \/>/g) ?? []).length, 1);
  assert.match(pageShellSource, /id="main-content"/);
});

test("global chrome mounts one tracking client only when monetization and inventory are active", () => {
  assert.match(globalChromeSource, /MONETIZATION_ENABLED && hasActiveDesktopPlacement/);
  assert.equal((globalChromeSource.match(/<SponsorTrackingClient \/>/g) ?? []).length, 1);
  assert.equal((globalChromeSource.match(/<DesktopSponsorRails inventory=\{inventory\} \/>/g) ?? []).length, 1);
});
