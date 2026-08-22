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

test("SponsorBlock uses the resolved placement ID and secure sponsor-link attributes", () => {
  assert.match(sponsorBlockSource, /data-sponsor-id=\{placement\.placement\.id\}/);
  assert.match(sponsorBlockSource, /target="_blank"/);
  assert.match(sponsorBlockSource, /rel="sponsored noopener noreferrer"/);
  assert.match(sponsorBlockSource, /href=\{sponsor\.destination\}/);
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
