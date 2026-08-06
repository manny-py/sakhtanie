export const categoryDefinitions = [
  {
    slug: "ai-assistants",
    title: "دستیارهای هوش مصنوعی و جست‌وجو",
    shortTitle: "دستیار و جست‌وجو",
    code: "ASK",
    description:
      "ابزارهای گفتگو، پاسخ‌گویی، پژوهش و جست‌وجوی مبتنی بر هوش مصنوعی.",
  },
  {
    slug: "ai-coding",
    title: "برنامه‌نویسی با هوش مصنوعی",
    shortTitle: "برنامه‌نویسی AI",
    code: "CODE",
    description:
      "دستیارهای کدنویسی، محیط‌های توسعه هوشمند و عامل‌های نرم‌افزاری.",
  },
  {
    slug: "app-website-builders",
    title: "ساخت سایت و اپلیکیشن",
    shortTitle: "سایت و اپ",
    code: "BUILD",
    description:
      "ابزارهای ساخت سایت، رابط کاربری و اپلیکیشن با کدنویسی یا بدون کد.",
  },
  {
    slug: "design-image",
    title: "طراحی و تولید تصویر",
    shortTitle: "طراحی و تصویر",
    code: "VIS",
    description:
      "ابزارهای طراحی رابط، تولید تصویر، ویرایش عکس و ساخت محتوای بصری.",
  },
  {
    slug: "video-audio-music",
    title: "ویدیو، صدا و موسیقی",
    shortTitle: "رسانه",
    code: "MEDIA",
    description:
      "ابزارهای تولید و ویرایش ویدیو، صدا، گفتار و موسیقی.",
  },
  {
    slug: "writing-seo",
    title: "نویسندگی، محتوا و سئو",
    shortTitle: "محتوا و سئو",
    code: "COPY",
    description:
      "ابزارهای نگارش، بازنویسی، تولید محتوا، تحقیق کلمه کلیدی و سئو.",
  },
  {
    slug: "productivity",
    title: "مدیریت کار و بهره‌وری",
    shortTitle: "بهره‌وری",
    code: "WORK",
    description:
      "ابزارهای مدیریت پروژه، وظایف، همکاری تیمی و برنامه‌ریزی کار.",
  },
  {
    slug: "notes-knowledge",
    title: "یادداشت، دانش و جلسه",
    shortTitle: "دانش و جلسه",
    code: "KNOW",
    description:
      "ابزارهای یادداشت‌برداری، مدیریت دانش، وایت‌برد و ثبت جلسات.",
  },
  {
    slug: "automation-no-code",
    title: "اتوماسیون و بدون کد",
    shortTitle: "اتوماسیون",
    code: "AUTO",
    description:
      "ابزارهای اتصال سرویس‌ها، ساخت گردش‌کار و خودکارسازی فرایندها.",
  },
  {
    slug: "commerce-forms-scheduling",
    title: "فروش، فرم و زمان‌بندی",
    shortTitle: "فروش و فرم",
    code: "BIZ",
    description:
      "ابزارهای فروش آنلاین، پرداخت، فرم‌ساز، رزرو و زمان‌بندی.",
  },
  {
    slug: "marketing-crm-support",
    title: "بازاریابی، CRM و پشتیبانی",
    shortTitle: "بازاریابی و CRM",
    code: "GROW",
    description:
      "ابزارهای جذب مشتری، ارتباطات بازاریابی، فروش و پشتیبانی.",
  },
  {
    slug: "data-analytics",
    title: "داده، تحلیل و گزارش‌گیری",
    shortTitle: "داده و تحلیل",
    code: "DATA",
    description:
      "ابزارهای تحلیل رفتار، داشبورد، هوش تجاری و گزارش‌گیری داده.",
  },
] as const;

export type CategoryDefinition =
  (typeof categoryDefinitions)[number];

export type CategorySlug =
  CategoryDefinition["slug"];
