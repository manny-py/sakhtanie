import { spawnSync } from "node:child_process";
import {
  DEFAULT_MAXIMUM_TEXT_FILE_SIZE,
  scanCurrentTree,
  scanText,
  textFromBuffer,
} from "./lib/secret-scanner.mjs";

const repositoryRoot = process.cwd();
const includeHistory = process.argv.includes("--history");
const maximumTextFileSize = DEFAULT_MAXIMUM_TEXT_FILE_SIZE;

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
      const text = textFromBuffer(
        batch.subarray(contentStart, contentEnd),
        maximumTextFileSize
      );

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

const findings = scanCurrentTree(repositoryRoot);

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
