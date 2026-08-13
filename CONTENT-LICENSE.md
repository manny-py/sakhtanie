# Sakhtanie content license

## Creative Commons license

Except for the exclusions below, original catalog entries, editorial analysis,
and original written documentation created for Sakhtanie are licensed under the
[Creative Commons Attribution 4.0 International license (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).

This document identifies the licensed material; it does not reproduce, replace,
or modify the Creative Commons legal code.

## Repository scope

CC BY 4.0 applies only to Sakhtanie-authored expressive content in these actual
Repository paths:

- `src/data/apps/*.json`: original summaries, verdicts, rationales, build
  analysis, comparisons, limitations, prompts, scores, FAQs, tags, and other
  editorial selections or arrangement.
- `src/lib/categories.ts`: original category titles and descriptions only. The
  TypeScript implementation remains software covered by the MIT License.
- `src/pages/**/*.astro` and `src/components/**/*.astro`: original editorial
  prose only. The Astro, TypeScript, HTML, and styling implementation remains
  software covered by the MIT License.
- `README.md`, `CONTRIBUTING.md`, and `SECURITY.md`: original written
  documentation.
- `.github/PULL_REQUEST_TEMPLATE.md` and `.github/ISSUE_TEMPLATE/*.yml`:
  original contribution-guidance prose only. The template configuration remains
  software covered by the MIT License.
- `docs/advertising.md`, `docs/catalog-expansion-wave-1.md`,
  `docs/catalog-expansion-wave-1.json`, and `docs/security/*.md`: original
  written documentation and editorial planning material.

Where a file combines executable or configuration code with editorial text,
CC BY 4.0 applies only to the original expressive text and editorial material.
The code and configuration portions are licensed under the [MIT License](LICENSE).

For clarity, the MIT software scope includes the original implementation and
configuration in `src/` (apart from the content portions identified above),
`scripts/`, `tests/`, `.github/workflows/`, and the Repository's root build,
package, lint, TypeScript, and deployment configuration files. The MIT License
does not cover the CC-licensed content or the excluded material below.

## Attribution and modifications

Reuse must provide appropriate attribution, include a link to CC BY 4.0, and,
where reasonably practicable, link to the source. A practical attribution is:

> Source: Sakhtanie (https://sakhtanie.ir)
>
> Licensed under CC BY 4.0.

If you share a modified version, you must indicate that changes were made and
retain an indication of previous modifications when applicable.

## Third-party material

CC BY 4.0 applies only to original Sakhtanie content. It does not grant rights
over third-party product or company names, domains, logos, screenshots,
trademarks, or other copyrighted material. In this Repository, third-party
material and references include:

- product logos in `public/app-logos/` and `scripts/app-logo-curated/`;
- third-party names, domains, logo references, and trademarks inside
  `src/data/apps/*.json`;
- third-party names, URLs, and source references in
  `scripts/app-logo-sources.json` and
  `scripts/app-logo-official-sources.json`; and
- third-party material that may be quoted, linked, or depicted in documentation
  or screenshots.

Those materials remain subject to the rights of their respective owners. No
third-party intellectual property is relicensed by this Repository.

## Brand and trademark notice

Unless explicit written permission is provided, the following are excluded
from both the MIT License and CC BY 4.0:

- the name “Sakhtanie”;
- the Persian name “ساختنیه؟”;
- project logos and identity marks, including `public/favicon.svg` and
  `public/favicon.ico`;
- the Social Preview artwork at
  `docs/assets/sakhtanie-social-preview.png`;
- the branded homepage image at `docs/assets/sakhtanie-homepage.png`;
- artwork intended for `public/og-image.png` and
  `public/apple-touch-icon.png`; and
- other distinctive Sakhtanie brand graphics and visual brand identity.

No license is granted to use these materials in a way that suggests
endorsement, affiliation, or an official fork of Sakhtanie. This notice does
not claim exclusive rights in generic colors, fonts, UI patterns, or ordinary
words, and it does not state or imply that any mark is registered. It does not
withdraw the MIT License from source code that implements the user interface,
but that code license does not grant branding or trademark rights in the
resulting presentation. Truthful use of the project name for the attribution
required by CC BY 4.0 is not restricted by this notice.
