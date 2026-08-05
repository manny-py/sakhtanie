export type Verdict = "yes" | "kinda" | "no";

export type Confidence = "high" | "medium" | "low";

export type Origin =
  | "iranian"
  | "global"
  | "open-source";

export type AppStatus =
  | "draft"
  | "review"
  | "published"
  | "archived";

export interface SakhtanieApp {
  schemaVersion: number;
  slug: string;

  name: {
    fa: string;
    en: string;
  };

  domain: string;
  origin: Origin;
  status: AppStatus;

  category: string;
  subcategory: string;

  tags: string[];

  summary: string;

  verdict: {
    value: Verdict;
    confidence: Confidence;
    short: string;
    reason: string;
  };

  build: {
    timeEstimate: string;
    skillLevel: string;
    coreLoop: string;

    requirements: {
      type: string;
      label: string;
    }[];

    limitations: string[];

    prompt: {
      title: string;
      content: string;
      language: string;
      tested: boolean;
      testedWith: string[];
      lastUpdated: string;
    };
  };

  scores: {
    technicalComplexity: number;
    externalDependency: number;
    proprietaryData: number;
    infrastructure: number;
    buildCost: number;
    maintenanceCost: number;
    personalValue: number;
    gapFromOriginal: number;
    iranRisk: number;
    economicValue: number;
  };
}
