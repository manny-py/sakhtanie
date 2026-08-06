export const categoryDefinitions = [
  {
    slug: "ai-assistants",
    title: "دستیارهای هوش مصنوعی",
    shortTitle: "هوش مصنوعی",
    code: "AI",
    description:
      "ابزارهایی برای گفتگو، تولید محتوا، جست‌وجو، برنامه‌نویسی و پردازش اطلاعات.",
  },
  {
    slug: "productivity",
    title: "بهره‌وری",
    shortTitle: "بهره‌وری",
    code: "PX",
    description:
      "ابزارهایی برای مدیریت کار، زمان‌بندی، همکاری تیمی و سازمان‌دهی اطلاعات.",
  },
  {
    slug: "website-commerce",
    title: "وب و کسب‌وکار",
    shortTitle: "وب و کسب‌وکار",
    code: "WEB",
    description:
      "ابزارهای طراحی سایت، فروش آنلاین، تجارت الکترونیک و ساخت تجربه‌های وب.",
  },
  {
    slug: "development-automation",
    title: "توسعه و اتوماسیون",
    shortTitle: "توسعه",
    code: "DEV",
    description:
      "ابزارهای برنامه‌نویسی، ساخت اپلیکیشن، اتصال سرویس‌ها و خودکارسازی فرایندها.",
  },
] as const;

export type CategoryDefinition =
  (typeof categoryDefinitions)[number];
