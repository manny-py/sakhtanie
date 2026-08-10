import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { relative, resolve } from "node:path";

export const DEFAULT_MAXIMUM_TEXT_FILE_SIZE = 2 * 1024 * 1024;

export const DEFAULT_IGNORED_DIRECTORIES = new Set([
  ".astro",
  ".git",
  "dist",
  "node_modules",
]);

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

export function scanText(text, metadata) {
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

export function textFromBuffer(
  buffer,
  maximumSize = DEFAULT_MAXIMUM_TEXT_FILE_SIZE
) {
  if (buffer.length > maximumSize || buffer.includes(0)) {
    return null;
  }

  return buffer.toString("utf8");
}

function sameFile(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

/**
 * Opens the pathname once. O_NOFOLLOW blocks a raced final symlink where the
 * platform supports it, while lstat/fstat identity checks fail closed if the
 * entry changes during open. Size/type checks and the read all use that same
 * descriptor, which is always closed; the validated pathname is never reopened.
 */
export function readRegularFileOnce(
  absolutePath,
  maximumSize = DEFAULT_MAXIMUM_TEXT_FILE_SIZE
) {
  let descriptor;

  try {
    const beforeOpen = lstatSync(absolutePath);

    if (beforeOpen.isSymbolicLink() || !beforeOpen.isFile()) {
      return null;
    }

    descriptor = openSync(
      absolutePath,
      constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0)
    );

    const openedFile = fstatSync(descriptor);
    const afterOpen = lstatSync(absolutePath);

    if (
      !openedFile.isFile() ||
      openedFile.size > maximumSize ||
      afterOpen.isSymbolicLink() ||
      !afterOpen.isFile() ||
      !sameFile(openedFile, afterOpen)
    ) {
      return null;
    }

    return readFileSync(descriptor);
  } catch {
    return null;
  } finally {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {
        // The entry is already rejected; never expose filesystem details.
      }
    }
  }
}

export function walkRegularFiles(
  directory,
  ignoredDirectories = DEFAULT_IGNORED_DIRECTORIES
) {
  const paths = [];
  let entries;

  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return paths;
  }

  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      continue;
    }

    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      continue;
    }

    const absolutePath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      paths.push(...walkRegularFiles(absolutePath, ignoredDirectories));
    } else if (entry.isFile()) {
      paths.push(absolutePath);
    }
  }

  return paths;
}

export function scanCurrentTree(
  repositoryRoot,
  {
    ignoredDirectories = DEFAULT_IGNORED_DIRECTORIES,
    maximumSize = DEFAULT_MAXIMUM_TEXT_FILE_SIZE,
  } = {}
) {
  const findings = [];

  for (const absolutePath of walkRegularFiles(
    repositoryRoot,
    ignoredDirectories
  )) {
    const buffer = readRegularFileOnce(absolutePath, maximumSize);
    const text = buffer === null ? null : textFromBuffer(buffer, maximumSize);

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
