import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { GLOBAL_SPONSOR_PLACEMENT_IDS } from "../src/lib/sponsor-placements.ts";
import { HOMEPAGE_PREMIUM_PLACEMENT_ID } from "../src/lib/sponsors.ts";

const advertiseSource = readFileSync(
  new URL("../src/pages/advertise.astro", import.meta.url),
  "utf8",
);
const advertisingDocs = readFileSync(
  new URL("../docs/advertising.md", import.meta.url),
  "utf8",
);

test("advertise page preserves the monetization redirect gate", () => {
  assert.match(advertiseSource, /if \(!MONETIZATION_ENABLED\)/);
  assert.match(advertiseSource, /Astro\.redirect\("\/", 302\)/);
});

test("advertise page describes the three final inventory surfaces accurately", () => {
  for (const code of [
    "GLOBAL_DESKTOP",
    "GLOBAL_MOBILE",
    "HOMEPAGE_PREMIUM",
  ]) {
    assert.match(advertiseSource, new RegExp(`code: "${code}"`));
  }

  assert.match(advertiseSource, /پنج جایگاه در ریل چپ و پنج جایگاه در ریل راست/);
  assert.match(advertiseSource, /پنج جایگاه در نوار بالا و پنج جایگاه در نوار پایین/);
  assert.match(advertiseSource, /حالت کاهش حرکت/);
  assert.match(advertiseSource, /عرض ۷۶۸ تا ۱۶۹۹ پیکسل نمایش داده نمی‌شود/);
  assert.match(advertiseSource, /این ۲۱ موقعیت هم‌زمان به یک کاربر نمایش داده نمی‌شوند/);
});

test("advertise page states editorial and security boundaries without fake commercial claims", () => {
  assert.match(advertiseSource, /حامی مالی نمی‌تواند رأی نهایی یا متن تحلیل را بخرد یا تغییر دهد/);
  assert.match(advertiseSource, /هیچ اثری بر امتیازها، مقایسه یا نتیجه‌گیری تحریریه ندارد/);
  assert.match(advertiseSource, /هیچ اسکریپت، iframe یا رهگیری شخص ثالث پذیرفته نمی‌شود/);
  assert.doesNotMatch(advertiseSource, /(?:تومان|دلار|بازدید تضمینی|نرخ کلیک تضمینی)/);
});

test("advertising documentation lists all 20 global placements and one native premium placement", () => {
  assert.equal(GLOBAL_SPONSOR_PLACEMENT_IDS.length, 20);

  for (const placementId of GLOBAL_SPONSOR_PLACEMENT_IDS) {
    assert.ok(advertisingDocs.includes(`\`${placementId}\``));
  }

  assert.ok(advertisingDocs.includes(`\`${HOMEPAGE_PREMIUM_PLACEMENT_ID}\``));
  assert.match(advertisingDocs, /20\nglobal placement IDs and one optional native Homepage Premium placement/);
});

test("advertising documentation captures responsive and reduced-motion contracts", () => {
  for (const contract of [
    ">=1700px",
    ">=812px",
    "656–811px",
    "<656px",
    "768–1699px",
    "<768px",
    "prefers-reduced-motion: reduce",
  ]) {
    assert.ok(advertisingDocs.includes(contract), `missing responsive contract: ${contract}`);
  }

  assert.match(advertisingDocs, /Visual clones are `aria-hidden`/);
  assert.match(advertisingDocs, /excluded from impression observation/);
});

test("advertising documentation preserves analytics and security contracts", () => {
  assert.match(advertisingDocs, /sponsor_impression/);
  assert.match(advertisingDocs, /sponsor_click/);
  assert.match(advertisingDocs, /\{ sponsor_id: placementId \}/);
  assert.match(advertisingDocs, /advertise_cta_click/);
  assert.match(advertisingDocs, /HTTPS/);
  assert.match(advertisingDocs, /URL-shortener/);
  assert.match(advertisingDocs, /local `\/sponsor-assets\/` SVG, PNG, or WebP/);
  assert.match(advertisingDocs, /rel="sponsored noopener noreferrer"/);
});

test("advertising documentation defines safe assignment, empty inventory, and verification", () => {
  assert.match(advertisingDocs, /globalSponsorInventory/);
  assert.match(advertisingDocs, /defineSponsor\(\)/);
  assert.match(advertisingDocs, /Leave unsold placements as `null`/);
  assert.match(advertisingDocs, /render no block, bar, landmark/);
  assert.match(advertisingDocs, /at or below 50 KB/);

  for (const command of [
    "npm test",
    "npm run lint",
    "npm run build",
    "npm run validate:data",
    "npm run scan:secrets",
    "git diff --check",
  ]) {
    assert.ok(advertisingDocs.includes(command), `missing verification command: ${command}`);
  }
});
