import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

const appDir = path.join(
  root,
  "src/data/apps"
);

const logoDir = path.join(
  root,
  "public/app-logos"
);

const sourceBase =
  "https://raw.githubusercontent.com/canivibecodeit/canivibecodeit/main";

const treeUrl =
  "https://api.github.com/repos/canivibecodeit/canivibecodeit/git/trees/main?recursive=1";

/*
 * Product-specific aliases where CanIVibeCodeIt names
 * a product after a plan/edition instead of its base name.
 */
const aliases = {
  bolt: [
    "public/icons/bolt-new.png",
  ],

  firebase: [
    "public/icons/firebase-blaze.png",
  ],

  leonardo: [
    "public/icons/leonardo-ai.png",
  ],

  slack: [
    "public/icons/slack-pro.png",
  ],
};

function sanitizeDomain(domain) {
  return String(domain || "")
    .replace(/\\\./g, ".")
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .trim();
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function fallbackSvg(name) {
  const initial =
    escapeXml(
      name?.trim()?.charAt(0)?.toUpperCase() || "?"
    );

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="#172019"/>
  <text
    x="64"
    y="69"
    text-anchor="middle"
    dominant-baseline="middle"
    fill="#22e863"
    font-family="Arial, sans-serif"
    font-size="58"
    font-weight="700"
  >${initial}</text>
</svg>
`;
}

function detectImage(bytes) {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }

  if (
    bytes.length >= 4 &&
    bytes[0] === 0x00 &&
    bytes[1] === 0x00 &&
    bytes[2] === 0x01 &&
    bytes[3] === 0x00
  ) {
    return "ico";
  }

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpg";
  }

  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WEBP"
  ) {
    return "webp";
  }

  if (
    bytes.length >= 6 &&
    (
      bytes.subarray(0, 6).toString() === "GIF87a" ||
      bytes.subarray(0, 6).toString() === "GIF89a"
    )
  ) {
    return "gif";
  }

  return null;
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

async function fetchJson(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30000),
    headers: {
      "user-agent": "SakhtanieCatalog/1.0",
      accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Manifest HTTP ${response.status}`
    );
  }

  return response.json();
}

async function download(sourcePath) {
  const url =
    `${sourceBase}/${sourcePath}`;

  let lastError;

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(20000),
        headers: {
          "user-agent": "SakhtanieCatalog/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      const bytes = Buffer.from(
        await response.arrayBuffer()
      );

      const extension =
        detectImage(bytes);

      if (!extension) {
        throw new Error(
          "unsupported image payload"
        );
      }

      return {
        bytes,
        extension,
        source: sourcePath,
      };
    } catch (error) {
      lastError = error;

      if (attempt < 4) {
        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              attempt * 750
            )
        );
      }
    }
  }

  throw lastError;
}

console.log(
  "Fetching CanIVibeCodeIt manifest..."
);

const tree =
  await fetchJson(treeUrl);

if (
  !Array.isArray(tree.tree) ||
  tree.truncated
) {
  throw new Error(
    "Invalid or truncated GitHub tree"
  );
}

const availablePaths =
  new Set(
    tree.tree
      .filter(
        item =>
          item.type === "blob"
      )
      .map(
        item => item.path
      )
  );

console.log(
  `Manifest entries: ${availablePaths.size}`
);

/*
 * Clean rebuild: after this point no Google/favicon
 * assets from previous runs can survive.
 */
await fs.rm(
  logoDir,
  {
    recursive: true,
    force: true,
  }
);

await fs.mkdir(
  logoDir,
  {
    recursive: true,
  }
);

const files =
  (await fs.readdir(appDir))
    .filter(
      file =>
        file.endsWith(".json")
    )
    .sort();

let directCount = 0;
let domainCount = 0;
let aliasCount = 0;
let fallbackCount = 0;

const sourceReport = [];

for (const file of files) {
  const filePath =
    path.join(appDir, file);

  const app =
    JSON.parse(
      await fs.readFile(
        filePath,
        "utf8"
      )
    );

  const domain =
    sanitizeDomain(app.domain);

  const direct =
    `public/icons/${app.slug}.png`;

  const domainAlternative =
    `public/icons/alt/${domain}.png`;

  const candidates = [
    {
      type: "canivibecodeit-direct",
      path: direct,
    },

    {
      type: "canivibecodeit-domain",
      path: domainAlternative,
    },

    ...(aliases[app.slug] || []).map(
      sourcePath => ({
        type: "canivibecodeit-alias",
        path: sourcePath,
      })
    ),
  ];

  /*
   * Avoid requesting paths that the repository
   * manifest says do not exist.
   */
  const existingCandidates =
    candidates.filter(
      candidate =>
        availablePaths.has(
          candidate.path
        )
    );

  let downloaded = null;
  let selectedCandidate = null;

  for (const candidate of existingCandidates) {
    try {
      downloaded =
        await download(
          candidate.path
        );

      selectedCandidate =
        candidate;

      break;
    } catch (error) {
      console.warn(
        `! ${app.slug}: ${candidate.path} failed (${error.message})`
      );
    }
  }

  let logo;

  if (
    downloaded &&
    selectedCandidate
  ) {
    const outputName =
      `${app.slug}.${downloaded.extension}`;

    await fs.writeFile(
      path.join(
        logoDir,
        outputName
      ),
      downloaded.bytes
    );

    logo =
      `/app-logos/${outputName}`;

    if (
      selectedCandidate.type ===
      "canivibecodeit-direct"
    ) {
      directCount++;
    } else if (
      selectedCandidate.type ===
      "canivibecodeit-domain"
    ) {
      domainCount++;
    } else {
      aliasCount++;
    }

    sourceReport.push({
      slug: app.slug,
      type: selectedCandidate.type,
      source:
        selectedCandidate.path,
      local: logo,
    });

    const marker =
      selectedCandidate.type ===
      "canivibecodeit-direct"
        ? "✓"
        : "→";

    console.log(
      `${marker} ${app.slug} <- ${selectedCandidate.path} [${downloaded.extension}]`
    );
  } else {
    const outputName =
      `${app.slug}.svg`;

    await fs.writeFile(
      path.join(
        logoDir,
        outputName
      ),
      fallbackSvg(
        app.name?.en ||
          app.slug
      ),
      "utf8"
    );

    logo =
      `/app-logos/${outputName}`;

    fallbackCount++;

    sourceReport.push({
      slug: app.slug,
      type: "generated-fallback",
      source: null,
      local: logo,
    });

    console.log(
      `~ ${app.slug} generated fallback`
    );
  }

  const updated =
    withLogoAfterDomain(
      app,
      logo
    );

  await fs.writeFile(
    filePath,
    `${JSON.stringify(updated, null, 2)}\n`,
    "utf8"
  );
}

await fs.writeFile(
  path.join(
    root,
    "scripts/app-logo-sources.json"
  ),
  `${JSON.stringify(sourceReport, null, 2)}\n`,
  "utf8"
);

console.log("");
console.log(
  `CVCI direct:   ${directCount}`
);

console.log(
  `CVCI domain:   ${domainCount}`
);

console.log(
  `CVCI alias:    ${aliasCount}`
);

console.log(
  `Fallback:      ${fallbackCount}`
);

console.log(
  `Total:         ${
    directCount +
    domainCount +
    aliasCount +
    fallbackCount
  }`
);
