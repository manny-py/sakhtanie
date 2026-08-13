# Contributing to Sakhtanie · مشارکت در ساختنیه

Thanks for helping improve Sakhtanie. The product and its catalog are currently Persian-first; issues and pull requests may be written in Persian or English.

Participation in Sakhtanie requires following the project [Code of Conduct](CODE_OF_CONDUCT.md).

## Workflow

1. Fork the repository and create a short, descriptive branch from the latest `main`.
2. Install the project with Node.js `>=22.12.0` and `npm install`.
3. Make one focused change. Do not mix unrelated cleanup into the pull request.
4. Use clear, imperative commit messages that describe the change.
5. Run the validation commands below and open a pull request with the relevant sources and results.

```bash
npm run validate:data
npm test
npm run lint
npm run build
npm run scan:secrets
```

## Catalog proposals and corrections

- To propose a new product, use the Tool Request issue form before preparing a larger data change.
- For a data correction, update the relevant file in `src/data/apps/` and keep it compatible with `src/lib/schema.ts`.
- Cite primary or otherwise reliable sources for factual claims, product capabilities, pricing, availability, or other information that can change.
- Separate sourced facts from editorial feasibility judgments. Do not present estimates as guarantees.
- Explain any changed verdict, estimate, limitation, score, or MVP scope in the pull request.

## Security and scope

Never commit tokens, secrets, personal information, analytics credentials, or real environment values. Use `.env.example` only as a public configuration reference. Do not include operational exploit details in a public issue; read [SECURITY.md](SECURITY.md).

## Contribution licensing

Contributions accepted into the Repository are distributed under the license applicable to the area being changed: software contributions under the [MIT License](LICENSE), and original catalog, editorial, or documentation contributions under [CC BY 4.0](CONTENT-LICENSE.md). Brand assets and third-party intellectual property are not covered by those licenses.

Small, reviewable pull requests are preferred. A submission may be declined or revised to protect catalog consistency and project scope.

---

## راهنمای کوتاه فارسی

1. Repository را Fork کنید و از آخرین `main` یک Branch کوتاه و مشخص بسازید.
2. با Node.js نسخهٔ `22.12.0` یا جدیدتر و دستور `npm install` وابستگی‌ها را نصب کنید.
3. تغییر را کوچک و متمرکز نگه دارید و برای Commit از پیام روشن و دستوری استفاده کنید.
4. Validationهای بالا را اجرا و نتیجه را در PR ثبت کنید.
5. برای پیشنهاد ابزار از فرم Tool Request استفاده کنید. برای اصلاح تحلیل، فایل مرتبط در `src/data/apps/` را همراه با دلیل و Source معتبر تغییر دهید.

مشارکت‌های پذیرفته‌شده در بخش نرم‌افزار تحت [MIT](LICENSE) و مشارکت‌های محتوایی و تحریریه تحت [CC BY 4.0](CONTENT-LICENSE.md) منتشر می‌شوند. دارایی‌های برند و مالکیت فکری اشخاص ثالث مشمول این مجوزها نیستند.

هیچ Secret، Token، اطلاعات شخصی یا مقدار واقعی Environment را Commit نکنید. ادعاها و داده‌های قابل‌تغییر باید Source معتبر داشته باشند. ارسال PR به‌معنای پذیرش قطعی آن نیست.
