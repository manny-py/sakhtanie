export type Verdict = "yes" | "kinda" | "no";

export type Confidence = "high" | "medium" | "low";

export interface SakhtanieApp {

  schemaVersion: number;

  slug: string;

  name: {
    fa: string;
    en: string;
  };

  domain: string;

  origin: "iranian" | "global" | "open-source";

  status: string;

  category: string;

  subcategory: string;

  tags: string[];

  relatedTools: string[];

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


  comparison: {

    original: string;

    buildableVersion: string;

    missing: string[];

  };


  audience: string[];


  monetization: {

    possible: boolean;

    models: string[];

  };


  seo: {

    keywords: string[];

    faq: {

      question: string;

      answer: string;

    }[];

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
