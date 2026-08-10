import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  CANIVIBECODEIT_TREE_URL,
  MANIFEST_RESPONSE_LIMIT,
  MAXIMUM_RETRIES,
  assertPassiveLocalSvg,
  atomicWriteFile,
  cvciUrlForPath,
  fetchAllowedResource,
  normalizeDomain,
  officialUrlForSourceId,
  replaceDirectoryFromStaging,
  resolveCuratedAsset,
  resolveLogoOutputPath,
  validateCvciPath,
  validateSlug,
} from "./lib/logo-security.mjs";

const root = process.cwd();
const appDir = path.join(root, "src/data/apps");
const logoDir = path.join(root, "public/app-logos");
const stagingLogoDir = path.join(
  path.dirname(logoDir),
  `.app-logos-staging-${randomUUID()}`
);

const aliases = {
  bolt: ["public/icons/bolt-new.png"],
  firebase: ["public/icons/firebase-blaze.png"],
  leonardo: ["public/icons/leonardo-ai.png"],
  slack: ["public/icons/slack-pro.png"],
};

const officialSourceIds = JSON.parse(
  await fs.readFile(
    path.join(root, "scripts/app-logo-official-sources.json"),
    "utf8"
  )
);

const localOfficialSources = {
  jira: {
    path: "scripts/app-logo-curated/jira.svg",
    provenance:
      "https://github.com/atlassian/atlascode/blob/main/src/rovo-dev/ui/prompt-box/promptContext/promptContextItem.tsx",
  },
};

/* Neutral local badges prevent broken-image UI without copying trademark art. */
const intentionalBadges = {
  "google-analytics": { symbol: "📊" },
  udemy: { symbol: "🎓" },
};

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function fallbackSvg(name) {
  const initial = escapeXml(name?.trim()?.charAt(0)?.toUpperCase() || "?");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="#172019"/>
  <text x="64" y="69" text-anchor="middle" dominant-baseline="middle" fill="#22e863" font-family="Arial, sans-serif" font-size="58" font-weight="700">${initial}</text>
</svg>
`;
}

function badgeSvg(symbol) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" fill="#172019"/>
  <rect x="1" y="1" width="126" height="126" rx="27" fill="none" stroke="#2b392e" stroke-width="2"/>
  <text x="64" y="68" text-anchor="middle" dominant-baseline="middle" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif" font-size="58">${escapeXml(symbol)}</text>
</svg>
`;
}

function withLogoAfterDomain(app, logo) {
  const result = {};

  for (const [key, value] of Object.entries(app)) {
    if (key === "logo") {
      continue;
    }

    result[key] = value;

    if (key === "domain") {
      result.logo = logo;
    }
  }

  if (!("logo" in result)) {
    result.logo = logo;
  }

  return result;
}

async function fetchManifest() {
  const { bytes } = await fetchAllowedResource(CANIVIBECODEIT_TREE_URL, {
    kind: "manifest",
    maximumBytes: MANIFEST_RESPONSE_LIMIT,
    headers: {
      "user-agent": "SakhtanieCatalog/1.0",
      accept: "application/vnd.github+json",
    },
  });

  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("Manifest is not valid JSON");
  }
}

async function downloadImage(url, sourceLabel) {
  let lastError;

  for (let attempt = 1; attempt <= MAXIMUM_RETRIES; attempt += 1) {
    try {
      const result = await fetchAllowedResource(url, {
        kind: "image",
        headers: {
          "user-agent": "SakhtanieCatalog/1.0",
          accept: "image/avif,image/webp,image/png,image/jpeg,image/x-icon",
        },
      });

      if (result.bytes.length < 100) {
        throw new Error("Image payload is too small");
      }

      return {
        bytes: result.bytes,
        extension: result.extension,
        source: sourceLabel,
      };
    } catch (error) {
      lastError = error;

      if (attempt < MAXIMUM_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, attempt * 500));
      }
    }
  }

  throw lastError;
}

async function downloadCvci(sourcePath) {
  const safePath = validateCvciPath(sourcePath);
  return downloadImage(cvciUrlForPath(safePath), safePath);
}

console.log("Fetching CanIVibeCodeIt manifest...");
const tree = await fetchManifest();

if (!Array.isArray(tree.tree) || tree.truncated) {
  throw new Error("Invalid or truncated GitHub tree");
}

const availablePaths = new Set(
  tree.tree
    .filter(item => item?.type === "blob" && typeof item.path === "string")
    .map(item => item.path)
);

console.log(`Manifest entries: ${availablePaths.size}`);

const files = (await fs.readdir(appDir))
  .filter(file => /^[a-z0-9]+(?:-[a-z0-9]+)*\.json$/.test(file))
  .sort();

const counts = {
  "canivibecodeit-direct": 0,
  "canivibecodeit-domain": 0,
  "canivibecodeit-alias": 0,
  "official-site": 0,
  "official-local": 0,
  "intentional-badge": 0,
  "generated-fallback": 0,
};
const sourceReport = [];
const catalogUpdates = [];
let stagingExists = false;

try {
  await fs.mkdir(stagingLogoDir, { recursive: false, mode: 0o700 });
  stagingExists = true;

  for (const file of files) {
    const filePath = path.join(appDir, file);
    const app = JSON.parse(await fs.readFile(filePath, "utf8"));
    const slug = validateSlug(app.slug);

    if (file !== `${slug}.json`) {
      throw new Error("Catalog filename and safe slug do not match");
    }

    const domain = normalizeDomain(app.domain);
    const candidates = [
      { type: "canivibecodeit-direct", path: `public/icons/${slug}.png` },
      { type: "canivibecodeit-domain", path: `public/icons/alt/${domain}.png` },
      ...(aliases[slug] || []).map(sourcePath => ({
        type: "canivibecodeit-alias",
        path: sourcePath,
      })),
    ];
    const existingCandidates = candidates.filter(candidate => {
      validateCvciPath(candidate.path);
      return availablePaths.has(candidate.path);
    });

    let downloaded = null;
    let selected = null;

    for (const candidate of existingCandidates) {
      try {
        downloaded = await downloadCvci(candidate.path);
        selected = candidate;
        break;
      } catch (error) {
        console.warn(`! ${slug}: approved candidate failed (${error.message})`);
      }
    }

    if (!downloaded && Object.hasOwn(officialSourceIds, slug)) {
      const sourceId = officialSourceIds[slug];
      const officialUrl = officialUrlForSourceId(sourceId);

      if (!officialUrl) {
        throw new Error(`Unknown official source ID for ${slug}`);
      }

      try {
        downloaded = await downloadImage(officialUrl, sourceId);
        selected = { type: "official-site", path: sourceId };
      } catch (error) {
        console.warn(`! ${slug}: approved official source failed (${error.message})`);
      }
    }

    if (!downloaded && Object.hasOwn(localOfficialSources, slug)) {
      const local = localOfficialSources[slug];
      const localPath = resolveCuratedAsset(root, local.path);
      const svg = assertPassiveLocalSvg(await fs.readFile(localPath, "utf8"));
      downloaded = {
        bytes: Buffer.from(svg),
        extension: "svg",
        source: local.provenance,
      };
      selected = { type: "official-local", path: local.provenance };
    }

    let logo;

    if (downloaded && selected) {
      const outputPath = resolveLogoOutputPath(
        stagingLogoDir,
        slug,
        downloaded.extension
      );
      await atomicWriteFile(outputPath, downloaded.bytes);
      logo = `/app-logos/${path.basename(outputPath)}`;
      counts[selected.type] += 1;
      sourceReport.push({
        slug,
        type: selected.type,
        source: selected.path,
        local: logo,
      });
    } else {
      const badge = intentionalBadges[slug];
      const type = badge ? "intentional-badge" : "generated-fallback";
      const svg = assertPassiveLocalSvg(
        badge ? badgeSvg(badge.symbol) : fallbackSvg(app.name?.en || slug)
      );
      const outputPath = resolveLogoOutputPath(stagingLogoDir, slug, "svg");
      await atomicWriteFile(outputPath, svg, { encoding: "utf8" });
      logo = `/app-logos/${path.basename(outputPath)}`;
      counts[type] += 1;
      sourceReport.push({ slug, type, source: null, local: logo });
    }

    catalogUpdates.push({
      filePath,
      contents: `${JSON.stringify(withLogoAfterDomain(app, logo), null, 2)}\n`,
    });
  }

  await replaceDirectoryFromStaging(stagingLogoDir, logoDir);
  stagingExists = false;

  for (const update of catalogUpdates) {
    await atomicWriteFile(update.filePath, update.contents, { encoding: "utf8" });
  }

  await atomicWriteFile(
    path.join(root, "scripts/app-logo-sources.json"),
    `${JSON.stringify(sourceReport, null, 2)}\n`,
    { encoding: "utf8" }
  );
} finally {
  if (stagingExists) {
    await fs.rm(stagingLogoDir, { recursive: true, force: true });
  }
}

console.log("");
for (const [type, count] of Object.entries(counts)) {
  console.log(`${type}: ${count}`);
}
console.log(`Total: ${Object.values(counts).reduce((sum, count) => sum + count, 0)}`);
