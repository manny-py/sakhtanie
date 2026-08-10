import { z } from "zod";

export const SPONSOR_LIMITS = {
  brand: 40,
  title: 70,
  description: 160,
  ctaLabel: 20,
} as const;

const SAFE_SPONSOR_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LOCAL_SPONSOR_ASSET =
  /^\/sponsor-assets\/[a-z0-9][a-z0-9/_-]*\.(?:svg|png|webp)$/i;

const URL_SHORTENER_HOSTS = new Set([
  "bit.ly",
  "buff.ly",
  "cutt.ly",
  "goo.gl",
  "ow.ly",
  "rebrand.ly",
  "shorturl.at",
  "t.co",
  "tinyurl.com",
]);

function isNonBlank(value: string) {
  return value.trim().length > 0;
}

function isBlockedShortenerHostname(hostname: string) {
  const normalizedHostname = hostname.toLowerCase().replace(/\.$/, "");

  return [...URL_SHORTENER_HOSTS].some(
    (blockedHostname) =>
      normalizedHostname === blockedHostname ||
      normalizedHostname.endsWith(`.${blockedHostname}`)
  );
}

function isApprovedDestination(value: string) {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      url.hostname.length > 0 &&
      url.username === "" &&
      url.password === "" &&
      !isBlockedShortenerHostname(url.hostname)
    );
  } catch {
    return false;
  }
}

export const sponsorSchema = z
  .object({
    id: z.string().min(1).max(80).regex(SAFE_SPONSOR_ID),
    brand: z.string().max(SPONSOR_LIMITS.brand),
    title: z.string().max(SPONSOR_LIMITS.title),
    description: z.string().max(SPONSOR_LIMITS.description),
    href: z.string().max(2_048),
    active: z.boolean(),
    logoSrc: z.string().regex(LOCAL_SPONSOR_ASSET).optional(),
    logoAlt: z
      .string()
      .min(1)
      .max(100)
      .refine(isNonBlank, "Logo alt text cannot be blank")
      .optional(),
    ctaLabel: z
      .string()
      .min(1)
      .max(SPONSOR_LIMITS.ctaLabel)
      .refine(isNonBlank, "CTA label cannot be blank")
      .optional(),
  })
  .strict()
  .superRefine((sponsor, context) => {
    if (sponsor.href && !isApprovedDestination(sponsor.href)) {
      context.addIssue({
        code: "custom",
        path: ["href"],
        message: "Sponsor destination must be an approved HTTPS URL",
      });
    }

    if (sponsor.logoAlt && !sponsor.logoSrc) {
      context.addIssue({
        code: "custom",
        path: ["logoAlt"],
        message: "Logo alt text requires a local sponsor logo",
      });
    }

    if (!sponsor.active) {
      return;
    }

    for (const field of ["brand", "title", "description", "href"] as const) {
      if (!isNonBlank(sponsor[field])) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: `Active sponsor requires ${field}`,
        });
      }
    }
  });

export type Sponsor = z.infer<typeof sponsorSchema>;
export type SponsorDefinition = z.input<typeof sponsorSchema>;

export function defineSponsor(definition: SponsorDefinition): Sponsor {
  return sponsorSchema.parse(definition);
}

export const homepagePrimarySponsor = defineSponsor({
  id: "homepage-primary",
  brand: "",
  title: "",
  description: "",
  href: "",
  active: false,
});

export const homepageSecondarySponsor = defineSponsor({
  id: "homepage-secondary",
  brand: "",
  title: "",
  description: "",
  href: "",
  active: false,
});
