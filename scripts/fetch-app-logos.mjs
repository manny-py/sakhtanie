import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

const appDir =
  path.join(root, "src/data/apps");

const logoDir =
  path.join(root, "public/app-logos");

const sourceBase =
  "https://raw.githubusercontent.com/canivibecodeit/canivibecodeit/main";

const treeUrl =
  "https://api.github.com/repos/canivibecodeit/canivibecodeit/git/trees/main?recursive=1";

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

const officialSources =
  JSON.parse(
    await fs.readFile(
      path.join(
        root,
        "scripts/app-logo-official-sources.json"
      ),
      "utf8"
    )
  );

const localOfficialSources = {
  jira: {
    path:
      "scripts/app-logo-curated/jira.svg",

    provenance:
      "https://github.com/atlassian/atlascode/blob/main/src/rovo-dev/ui/prompt-box/promptContext/promptContextItem.tsx",
  },
};

/*
 * Intentionally not copied from trademark artwork.
 * These are neutral UI badges so the catalog never
 * visually looks like an asset failed to load.
 */
const intentionalBadges = {
  "google-analytics": {
    symbol: "📊",
  },

  udemy: {
    symbol: "🎓",
  },
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
      name?.trim()
        ?.charAt(0)
        ?.toUpperCase() || "?"
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

function badgeSvg(symbol) {
  const safe =
    escapeXml(symbol);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect
    width="128"
    height="128"
    rx="28"
    fill="#172019"
  />
  <rect
    x="1"
    y="1"
    width="126"
    height="126"
    rx="27"
    fill="none"
    stroke="#2b392e"
    stroke-width="2"
  />
  <text
    x="64"
    y="68"
    text-anchor="middle"
    dominant-baseline="middle"
    font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif"
    font-size="58"
  >${safe}</text>
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
    bytes
      .subarray(0, 4)
      .toString() === "RIFF" &&
    bytes
      .subarray(8, 12)
      .toString() === "WEBP"
  ) {
    return "webp";
  }

  if (
    bytes.length >= 6 &&
    (
      bytes
        .subarray(0, 6)
        .toString() === "GIF87a" ||
      bytes
        .subarray(0, 6)
        .toString() === "GIF89a"
    )
  ) {
    return "gif";
  }

  if (
    bytes.length >= 12 &&
    (
      bytes
        .subarray(4, 12)
        .toString() === "ftypavif" ||
      bytes
        .subarray(4, 12)
        .toString() === "ftypavis"
    )
  ) {
    return "avif";
  }

  const textHead =
    bytes
      .subarray(
        0,
        Math.min(
          bytes.length,
          2048
        )
      )
      .toString("utf8")
      .replace(/^\uFEFF/, "")
      .trimStart();

  if (
    textHead.startsWith("<svg") ||
    (
      textHead.startsWith("<?xml") &&
      textHead.includes("<svg")
    )
  ) {
    return "svg";
  }

  return null;
}

function withLogoAfterDomain(
  app,
  logo
) {
  const result = {};

  for (
    const [key, value]
    of Object.entries(app)
  ) {
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
  const response =
    await fetch(
      url,
      {
        signal:
          AbortSignal.timeout(
            30000
          ),

        headers: {
          "user-agent":
            "SakhtanieCatalog/1.0",

          accept:
            "application/vnd.github+json",
        },
      }
    );

  if (!response.ok) {
    throw new Error(
      `Manifest HTTP ${response.status}`
    );
  }

  return response.json();
}

async function downloadUrl(
  url,
  sourceLabel = url
) {
  let lastError;

  for (
    let attempt = 1;
    attempt <= 4;
    attempt++
  ) {
    try {
      const response =
        await fetch(
          url,
          {
            redirect: "follow",

            signal:
              AbortSignal.timeout(
                20000
              ),

            headers: {
              "user-agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/150 Safari/537.36",

              accept:
                "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            },
          }
        );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      const bytes =
        Buffer.from(
          await response.arrayBuffer()
        );

      if (bytes.length < 100) {
        throw new Error(
          "image payload too small"
        );
      }

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
        source: sourceLabel,
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

async function downloadCvci(
  sourcePath
) {
  return downloadUrl(
    `${sourceBase}/${sourcePath}`,
    sourcePath
  );
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
let officialCount = 0;
let localOfficialCount = 0;
let intentionalCount = 0;
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
    sanitizeDomain(
      app.domain
    );

  const candidates = [
    {
      type:
        "canivibecodeit-direct",

      path:
        `public/icons/${app.slug}.png`,
    },

    {
      type:
        "canivibecodeit-domain",

      path:
        `public/icons/alt/${domain}.png`,
    },

    ...(
      aliases[app.slug] || []
    ).map(
      sourcePath => ({
        type:
          "canivibecodeit-alias",

        path:
          sourcePath,
      })
    ),
  ];

  const existingCandidates =
    candidates.filter(
      candidate =>
        availablePaths.has(
          candidate.path
        )
    );

  let downloaded = null;
  let selected = null;

  for (
    const candidate
    of existingCandidates
  ) {
    try {
      downloaded =
        await downloadCvci(
          candidate.path
        );

      selected =
        candidate;

      break;
    } catch (error) {
      console.warn(
        `! ${app.slug}: ${candidate.path} failed (${error.message})`
      );
    }
  }

  if (
    !downloaded &&
    officialSources[app.slug]
  ) {
    const url =
      officialSources[app.slug];

    try {
      downloaded =
        await downloadUrl(
          url,
          url
        );

      selected = {
        type: "official-site",
        path: url,
      };
    } catch (error) {
      console.warn(
        `! ${app.slug}: official source failed (${error.message})`
      );
    }
  }

  if (
    !downloaded &&
    localOfficialSources[
      app.slug
    ]
  ) {
    const local =
      localOfficialSources[
        app.slug
      ];

    const bytes =
      await fs.readFile(
        path.join(
          root,
          local.path
        )
      );

    const extension =
      detectImage(bytes);

    if (!extension) {
      throw new Error(
        `Unsupported local official asset: ${app.slug}`
      );
    }

    downloaded = {
      bytes,
      extension,
      source:
        local.provenance,
    };

    selected = {
      type:
        "official-local",

      path:
        local.provenance,
    };
  }

  let logo;

  if (
    downloaded &&
    selected
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
      selected.type ===
      "canivibecodeit-direct"
    ) {
      directCount++;
    } else if (
      selected.type ===
      "canivibecodeit-domain"
    ) {
      domainCount++;
    } else if (
      selected.type ===
      "canivibecodeit-alias"
    ) {
      aliasCount++;
    } else if (
      selected.type ===
      "official-site"
    ) {
      officialCount++;
    } else if (
      selected.type ===
      "official-local"
    ) {
      localOfficialCount++;
    } else {
      throw new Error(
        `Unknown source type: ${selected.type}`
      );
    }

    sourceReport.push({
      slug: app.slug,
      type: selected.type,
      source:
        selected.path,
      local: logo,
    });

    const marker =
      selected.type ===
      "canivibecodeit-direct"
        ? "✓"
        : selected.type ===
          "official-site"
          ? "◎"
          : selected.type ===
            "official-local"
            ? "◆"
            : "→";

    console.log(
      `${marker} ${app.slug} <- ${selected.path} [${downloaded.extension}]`
    );
  } else if (
    intentionalBadges[
      app.slug
    ]
  ) {
    const badge =
      intentionalBadges[
        app.slug
      ];

    const outputName =
      `${app.slug}.svg`;

    await fs.writeFile(
      path.join(
        logoDir,
        outputName
      ),
      badgeSvg(
        badge.symbol
      ),
      "utf8"
    );

    logo =
      `/app-logos/${outputName}`;

    intentionalCount++;

    sourceReport.push({
      slug: app.slug,
      type:
        "intentional-badge",
      source: null,
      local: logo,
    });

    console.log(
      `◇ ${app.slug} intentional badge ${badge.symbol}`
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
      type:
        "generated-fallback",
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
    `${JSON.stringify(
      updated,
      null,
      2
    )}\n`,
    "utf8"
  );
}

await fs.writeFile(
  path.join(
    root,
    "scripts/app-logo-sources.json"
  ),
  `${JSON.stringify(
    sourceReport,
    null,
    2
  )}\n`,
  "utf8"
);

console.log("");
console.log(
  `CVCI direct:     ${directCount}`
);

console.log(
  `CVCI domain:     ${domainCount}`
);

console.log(
  `CVCI alias:      ${aliasCount}`
);

console.log(
  `Official remote: ${officialCount}`
);

console.log(
  `Official local:  ${localOfficialCount}`
);

console.log(
  `Intentional:     ${intentionalCount}`
);

console.log(
  `Fallback:        ${fallbackCount}`
);

console.log(
  `Total:           ${
    directCount +
    domainCount +
    aliasCount +
    officialCount +
    localOfficialCount +
    intentionalCount +
    fallbackCount
  }`
);
