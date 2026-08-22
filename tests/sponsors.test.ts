import assert from "node:assert/strict";
import test from "node:test";

import {
  GLOBAL_SPONSOR_PLACEMENT_IDS,
  SPONSOR_SURFACES,
  defineGlobalSponsorInventory,
  getGlobalSponsorPlacements,
  globalSponsorInventory,
  resolveGlobalSponsorPlacement,
  type GlobalSponsorPlacementId,
} from "../src/lib/sponsor-placements.ts";
import {
  HOMEPAGE_PREMIUM_PLACEMENT_ID,
  homepagePrimarySponsor,
  sponsorSchema,
} from "../src/lib/sponsors.ts";

const validActiveSponsor = {
  id: "homepage-primary",
  brand: "Example Cloud",
  title: "زیرساخت ساده برای ساخت محصول بعدی",
  description:
    "سرویس ابری کنترل‌شده برای تیم‌هایی که محصول دیجیتال می‌سازند.",
  href: "https://example.com/product?utm_source=sakhtanie",
  active: true,
  ctaLabel: "مشاهده سرویس",
};

test("accepts a valid active native sponsor", () => {
  assert.equal(sponsorSchema.safeParse(validActiveSponsor).success, true);
});

test("accepts a valid inactive placeholder", () => {
  assert.equal(
    sponsorSchema.safeParse({
      id: "inactive-test-placement",
      brand: "",
      title: "",
      description: "",
      href: "",
      active: false,
    }).success,
    true
  );
});

test("rejects a brand longer than 40 characters", () => {
  assert.equal(
    sponsorSchema.safeParse({
      ...validActiveSponsor,
      brand: "b".repeat(41),
    }).success,
    false
  );
});

test("rejects a title longer than 70 characters", () => {
  assert.equal(
    sponsorSchema.safeParse({
      ...validActiveSponsor,
      title: "t".repeat(71),
    }).success,
    false
  );
});

test("rejects a description longer than 160 characters", () => {
  assert.equal(
    sponsorSchema.safeParse({
      ...validActiveSponsor,
      description: "d".repeat(161),
    }).success,
    false
  );
});

test("rejects a CTA longer than 20 characters", () => {
  assert.equal(
    sponsorSchema.safeParse({
      ...validActiveSponsor,
      ctaLabel: "c".repeat(21),
    }).success,
    false
  );
});

test("rejects an HTTP destination", () => {
  assert.equal(
    sponsorSchema.safeParse({
      ...validActiveSponsor,
      href: "http://example.com/product",
    }).success,
    false
  );
});

test("rejects a javascript destination", () => {
  assert.equal(
    sponsorSchema.safeParse({
      ...validActiveSponsor,
      href: "javascript:alert(1)",
    }).success,
    false
  );
});

test("rejects destination URLs containing credentials", () => {
  assert.equal(
    sponsorSchema.safeParse({
      ...validActiveSponsor,
      href: "https://user:password@example.com/product",
    }).success,
    false
  );
});

test("rejects an exact blocked URL shortener hostname", () => {
  assert.equal(
    sponsorSchema.safeParse({
      ...validActiveSponsor,
      href: "https://bit.ly/example",
    }).success,
    false
  );
});

test("rejects a subdomain of a blocked URL shortener hostname", () => {
  assert.equal(
    sponsorSchema.safeParse({
      ...validActiveSponsor,
      href: "https://foo.bit.ly/example",
    }).success,
    false
  );
});

test("allows an unrelated hostname containing similar text", () => {
  assert.equal(
    sponsorSchema.safeParse({
      ...validActiveSponsor,
      href: "https://notbit.ly/product",
    }).success,
    true
  );
});

test("rejects an external sponsor logo URL", () => {
  assert.equal(
    sponsorSchema.safeParse({
      ...validActiveSponsor,
      logoSrc: "https://cdn.example.com/logo.svg",
    }).success,
    false
  );
});

test("rejects an unsupported sponsor asset extension", () => {
  assert.equal(
    sponsorSchema.safeParse({
      ...validActiveSponsor,
      logoSrc: "/sponsor-assets/example.gif",
    }).success,
    false
  );
});

test("accepts local SVG, PNG, and WebP sponsor assets", () => {
  for (const extension of ["svg", "png", "webp"]) {
    assert.equal(
      sponsorSchema.safeParse({
        ...validActiveSponsor,
        logoSrc: `/sponsor-assets/example.${extension}`,
        logoAlt: "لوگوی Example Cloud",
      }).success,
      true
    );
  }
});

test("rejects blank explicit logo alt text", () => {
  assert.equal(
    sponsorSchema.safeParse({
      ...validActiveSponsor,
      logoSrc: "/sponsor-assets/example.svg",
      logoAlt: "   ",
    }).success,
    false
  );
});

test("rejects logo alt text without a local sponsor asset", () => {
  assert.equal(
    sponsorSchema.safeParse({
      ...validActiveSponsor,
      logoAlt: "لوگوی Example Cloud",
    }).success,
    false
  );
});

test("requires display content when a sponsor is active", () => {
  assert.equal(
    sponsorSchema.safeParse({
      id: "homepage-primary",
      brand: "",
      title: "",
      description: "",
      href: "",
      active: true,
    }).success,
    false
  );
});

test("rejects arbitrary presentation and tracking fields", () => {
  assert.equal(
    sponsorSchema.safeParse({
      ...validActiveSponsor,
      html: "<strong>custom creative</strong>",
      trackingPixel: "https://tracker.example/pixel",
      className: "advertiser-controlled",
    }).success,
    false
  );
});

const canonicalUnassignedPlacements = GLOBAL_SPONSOR_PLACEMENT_IDS.map(
  (id) => ({ id, campaignId: null })
);

function defineTestInventory(
  overrides: {
    campaigns?: Parameters<typeof defineGlobalSponsorInventory>[0]["campaigns"];
    placements?: Parameters<typeof defineGlobalSponsorInventory>[0]["placements"];
  } = {}
) {
  return defineGlobalSponsorInventory({
    campaigns: overrides.campaigns ?? [],
    placements: overrides.placements ?? canonicalUnassignedPlacements,
  });
}

test("defines exactly 20 unique canonical global placement IDs", () => {
  assert.equal(GLOBAL_SPONSOR_PLACEMENT_IDS.length, 20);
  assert.equal(new Set(GLOBAL_SPONSOR_PLACEMENT_IDS).size, 20);
});

test("defines four ordered sponsor surfaces with five placements each", () => {
  assert.deepEqual(SPONSOR_SURFACES, [
    "desktop-left",
    "desktop-right",
    "mobile-top",
    "mobile-bottom",
  ]);

  for (const surface of SPONSOR_SURFACES) {
    assert.deepEqual(
      getGlobalSponsorPlacements(surface).map((placement) => placement.id),
      Array.from(
        { length: 5 },
        (_, index) => `${surface}-${index + 1}`
      )
    );
  }
});

test("normalizes placement configuration to canonical deterministic order", () => {
  const inventory = defineTestInventory({
    placements: [...canonicalUnassignedPlacements].reverse(),
  });

  assert.deepEqual(
    inventory.placements.map((placement) => placement.id),
    GLOBAL_SPONSOR_PLACEMENT_IDS
  );
});

test("rejects an unknown global placement", () => {
  assert.throws(
    () =>
      defineTestInventory({
        placements: [
          ...canonicalUnassignedPlacements.slice(0, -1),
          { id: "desktop-center-1", campaignId: null },
        ],
      }),
    /Invalid option/
  );
});

test("rejects a duplicate global placement", () => {
  assert.throws(
    () =>
      defineTestInventory({
        placements: [
          ...canonicalUnassignedPlacements,
          canonicalUnassignedPlacements[0],
        ],
      }),
    /Duplicate global sponsor placement/
  );
});

test("rejects an invalid placement ordinal", () => {
  assert.throws(
    () =>
      defineTestInventory({
        placements: [
          ...canonicalUnassignedPlacements.slice(0, -1),
          { id: "mobile-bottom-6", campaignId: null },
        ],
      }),
    /Invalid option/
  );
});

test("rejects an unknown sponsor surface", () => {
  assert.throws(
    () =>
      defineTestInventory({
        placements: [
          ...canonicalUnassignedPlacements.slice(0, -1),
          { id: "tablet-top-5", campaignId: null },
        ],
      }),
    /Invalid option/
  );
});

test("detects a missing canonical global placement", () => {
  assert.throws(
    () =>
      defineTestInventory({
        placements: canonicalUnassignedPlacements.slice(0, -1),
      }),
    /Missing canonical global sponsor placement: mobile-bottom-5/
  );
});

test("rejects an invalid campaign reference", () => {
  assert.throws(
    () =>
      defineTestInventory({
        placements: canonicalUnassignedPlacements.map((placement, index) =>
          index === 0
            ? { ...placement, campaignId: "missing-campaign" }
            : placement
        ),
      }),
    /Unknown sponsor campaign missing-campaign/
  );
});

test("resolves the QA fixture placement as an explicit active state", () => {
  const resolved = resolveGlobalSponsorPlacement("desktop-left-1");

  assert.equal(resolved.placement.campaignId, "qa-sponsor-one");
  assert.equal(resolved.campaign?.id, "qa-sponsor-one");
  assert.equal(resolved.active, true);
});

test("resolves one validated campaign across multiple placements", () => {
  const campaign = {
    ...validActiveSponsor,
    id: "example-campaign",
  };
  const assignedIds = new Set<GlobalSponsorPlacementId>([
    "desktop-left-1",
    "mobile-top-1",
  ]);
  const inventory = defineTestInventory({
    campaigns: [campaign],
    placements: canonicalUnassignedPlacements.map((placement) => ({
      ...placement,
      campaignId: assignedIds.has(placement.id) ? campaign.id : null,
    })),
  });

  for (const id of assignedIds) {
    const resolved = resolveGlobalSponsorPlacement(id, inventory);
    assert.equal(resolved.placement.campaignId, campaign.id);
    assert.equal(resolved.campaign?.id, campaign.id);
    assert.equal(resolved.active, true);
  }
});

test("rejects duplicate campaign definitions", () => {
  const campaign = {
    ...validActiveSponsor,
    id: "duplicate-campaign",
  };

  assert.throws(
    () =>
      defineTestInventory({
        campaigns: [campaign, campaign],
      }),
    /Duplicate sponsor campaign/
  );
});

test("keeps every QA global placement assigned to a valid active campaign", () => {
  assert.equal(globalSponsorInventory.placements.length, 20);
  assert.equal(
    globalSponsorInventory.placements.every(
      (placement) => placement.campaignId !== null
    ),
    true
  );
  assert.equal(Object.keys(globalSponsorInventory.campaigns).length, 5);
  assert.equal(
    Object.values(globalSponsorInventory.campaigns).every(
      (campaign) => campaign.active
    ),
    true
  );
});

test("keeps one homepage premium placement valid and separate from global inventory", () => {
  assert.equal(sponsorSchema.safeParse(homepagePrimarySponsor).success, true);
  assert.equal(homepagePrimarySponsor.id, HOMEPAGE_PREMIUM_PLACEMENT_ID);
  assert.equal(GLOBAL_SPONSOR_PLACEMENT_IDS.length + 1, 21);
  assert.equal(
    GLOBAL_SPONSOR_PLACEMENT_IDS.includes(
      homepagePrimarySponsor.id as GlobalSponsorPlacementId
    ),
    false
  );
});
