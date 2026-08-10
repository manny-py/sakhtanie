import assert from "node:assert/strict";
import test from "node:test";

import { sponsorSchema } from "../src/lib/sponsors.ts";

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
      id: "homepage-secondary",
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
