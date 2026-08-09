import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

const repositoryRoot = process.cwd();
const includeHistory = process.argv.includes("--history");
const ignoredDirectories = new Set([
  ".astro",
  ".git",
  "dist",
  "node_modules",
]);
const maximumTextFileSize = 2 * 1024 * 1024;

const highConfidencePatterns = [
  {
    type: "private-key",
    pattern:
      /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g,
  },
  {
    type: "github-token",
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,255}\b/g,
  },
  {
    type: "openai-api-key",
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    type: "aws-access-key",
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  },
  {
    type: "google-api-key",
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
  },
  {
    type: "slack-token",
    pattern: /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/g,
  },
];

const credentialAssignment =
  /\b(api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|private[_-]?key)\b\s*[:=]\s*["']([^"'\r\n]{8,})["']/gi;

const placeholderTerms =
  /(?:example|placeholder|changeme|replace[_-]?me|your[_-]|<[^>]+>|\*{3,})/i;

function lineNumberAt(text, index) {
  let line = 1;

  for (let position = 0; position < index; position += 1) {
    if (text.charCodeAt(position) === 10) {
      line += 1;
    }
  }

  return line;
}

function scanText(text, metadata) {
  const findings = [];

  for (const specification of highConfidencePatterns) {
    specification.pattern.lastIndex = 0;

    for (const match of text.matchAll(specification.pattern)) {
      findings.push({
        ...metadata,
        type: specification.type,
        line: lineNumberAt(text, match.index ?? 0),
      });
    }
  }

  credentialAssignment.lastIndex = 0;

  for (const match of text.matchAll(credentialAssignment)) {
    const value = match[2];

    if (placeholderTerms.test(value)) {
      continue;
    }

    findings.push({
      ...metadata,
      type: "credential-assignment",
      line: lineNumberAt(text, match.index ?? 0),
    });
  }

  return findings;
}

function textFromBuffer(buffer) {
  if (
    buffer.length > maximumTextFileSize ||
    buffer.includes(0)
  ) {
    return null;
  }

  return buffer.toString("utf8");
}

function walk(directory) {
  const paths = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      continue;
    }

    const absolutePath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      paths.push(...walk(absolutePath));
    } else if (entry.isFile()) {
      paths.push(absolutePath);
    }
  }

  return paths;
}

function scanCurrentTree() {
  const findings = [];

  for (const absolutePath of walk(repositoryRoot)) {
    let fileBuffer;

    try {
      if (statSync(absolutePath).size > maximumTextFileSize) {
        continue;
      }

      fileBuffer = readFileSync(absolutePath);
    } catch {
      continue;
    }

    const text = textFromBuffer(fileBuffer);

    if (text === null) {
      continue;
    }

    findings.push(
      ...scanText(text, {
        scope: "current-tree",
        path: relative(repositoryRoot, absolutePath),
      })
    );
  }

  return findings;
}

function runGit(arguments_, options = {}) {
  const encoding = Object.hasOwn(options, "encoding")
    ? options.encoding
    : "utf8";

  const result = spawnSync("git", arguments_, {
    cwd: repositoryRoot,
    encoding,
    input: options.input,
    maxBuffer: 512 * 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new Error(`git ${arguments_.join(" ")} failed`);
  }

  return result.stdout;
}

function scanReachableBlobs() {
  const objectList = runGit(["rev-list", "--objects", "--all"]);
  const pathsByObject = new Map();

  for (const line of objectList.split("\n")) {
    const separator = line.indexOf(" ");

    if (separator < 1) {
      continue;
    }

    const objectId = line.slice(0, separator);
    const path = line.slice(separator + 1);

    if (path && !pathsByObject.has(objectId)) {
      pathsByObject.set(objectId, path);
    }
  }

  const objectIds = [...pathsByObject.keys()];
  const batch = runGit(["cat-file", "--batch"], {
    encoding: null,
    input: Buffer.from(`${objectIds.join("\n")}\n`),
  });
  const findings = [];
  let offset = 0;

  for (const requestedObjectId of objectIds) {
    const headerEnd = batch.indexOf(10, offset);

    if (headerEnd < 0) {
      throw new Error("Unexpected end of git cat-file output");
    }

    const header = batch.subarray(offset, headerEnd).toString("utf8");
    const [objectId, objectType, sizeText] = header.split(" ");
    const size = Number(sizeText);
    const contentStart = headerEnd + 1;
    const contentEnd = contentStart + size;

    if (
      objectId !== requestedObjectId ||
      !Number.isSafeInteger(size) ||
      contentEnd > batch.length
    ) {
      throw new Error("Invalid git cat-file batch response");
    }

    if (objectType === "blob" && size <= maximumTextFileSize) {
      const text = textFromBuffer(batch.subarray(contentStart, contentEnd));

      if (text !== null) {
        findings.push(
          ...scanText(text, {
            scope: "reachable-history",
            path: pathsByObject.get(objectId),
            object: objectId,
          })
        );
      }
    }

    offset = contentEnd + 1;
  }

  return findings;
}

function scanCommitMessages() {
  const log = runGit(["log", "--all", "--format=%H%x00%B%x00"]);
  const records = log.split("\0");
  const findings = [];

  for (let index = 0; index + 1 < records.length; index += 2) {
    const commit = records[index].trim();
    const message = records[index + 1];

    if (!commit || !message) {
      continue;
    }

    findings.push(
      ...scanText(message, {
        scope: "commit-message",
        path: "(commit message)",
        object: commit,
      })
    );
  }

  return findings;
}

const findings = scanCurrentTree();

if (includeHistory) {
  findings.push(...scanReachableBlobs(), ...scanCommitMessages());
}

if (findings.length > 0) {
  for (const finding of findings) {
    const object = finding.object ? ` object=${finding.object}` : "";
    console.error(
      `${finding.scope}: ${finding.type} ${finding.path}:${finding.line}${object}`
    );
  }

  console.error(`Secret scan failed with ${findings.length} finding(s).`);
  process.exitCode = 1;
} else {
  console.log(
    includeHistory
      ? "Secret scan passed: current tree, reachable history, and commit messages."
      : "Secret scan passed: current tree."
  );
}
