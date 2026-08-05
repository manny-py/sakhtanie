import { z } from "zod";

export const appSchema = z.object({
  schemaVersion: z.number(),

  slug: z.string(),

  name: z.object({
    fa: z.string(),
    en: z.string(),
  }),

  domain: z.string(),

  origin: z.enum([
    "iranian",
    "global",
    "open-source",
  ]),

  status: z.enum([
    "draft",
    "review",
    "published",
    "archived",
  ]),

  category: z.string(),
  subcategory: z.string(),

  tags: z.array(z.string()),

  summary: z.string(),

  verdict: z.object({
    value: z.enum([
      "yes",
      "kinda",
      "no",
    ]),
    confidence: z.enum([
      "high",
      "medium",
      "low",
    ]),
    short: z.string(),
    reason: z.string(),
  }),

  build: z.object({
    timeEstimate: z.string(),
    skillLevel: z.string(),
    coreLoop: z.string(),

    requirements: z.array(
      z.object({
        type: z.string(),
        label: z.string(),
      })
    ),

    limitations: z.array(z.string()),

    prompt: z.object({
      title: z.string(),
      content: z.string(),
      language: z.string(),
      tested: z.boolean(),
      testedWith: z.array(z.string()),
      lastUpdated: z.string(),
    }),
  }),

  scores: z.object({
    technicalComplexity: z.number().min(0).max(5),
    externalDependency: z.number().min(0).max(5),
    proprietaryData: z.number().min(0).max(5),
    infrastructure: z.number().min(0).max(5),
    buildCost: z.number().min(0).max(5),
    maintenanceCost: z.number().min(0).max(5),
    personalValue: z.number().min(0).max(5),
    gapFromOriginal: z.number().min(0).max(5),
    iranRisk: z.number().min(0).max(5),
    economicValue: z.number().min(0).max(5),
  }),
});
