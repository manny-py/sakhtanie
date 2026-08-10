import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  readRegularFileOnce,
  scanCurrentTree,
  textFromBuffer,
  walkRegularFiles,
} from "../scripts/lib/secret-scanner.mjs";

function temporaryDirectory(prefix: string) {
  return mkdtempSync(join(tmpdir(), prefix));
}

test("reads a normal regular text file from its validated descriptor", () => {
  const directory = temporaryDirectory("secret-scanner-regular-");
  const file = join(directory, "plain.txt");
  writeFileSync(file, "ordinary text", "utf8");

  assert.equal(readRegularFileOnce(file)?.toString("utf8"), "ordinary text");
});

test("skips an oversized file before reading its contents", () => {
  const directory = temporaryDirectory("secret-scanner-large-");
  const file = join(directory, "large.txt");
  writeFileSync(file, Buffer.alloc(33, 0x61));

  assert.equal(readRegularFileOnce(file, 32), null);
});

test("skips binary files", () => {
  assert.equal(textFromBuffer(Buffer.from([0x61, 0x00, 0x62])), null);
});

test("rejects a final-component symlink, including one outside the tree", () => {
  const repository = temporaryDirectory("secret-scanner-repo-");
  const outside = temporaryDirectory("secret-scanner-outside-");
  const target = join(outside, "outside.txt");
  const link = join(repository, "linked.txt");
  const secretText = ["pass", "word = \"", "definitely-sensitive-value", "\""].join("");
  writeFileSync(target, secretText, "utf8");
  symlinkSync(target, link);

  assert.equal(readRegularFileOnce(link), null);
  assert.deepEqual(scanCurrentTree(repository), []);
});

test("does not traverse a symlinked directory", () => {
  const repository = temporaryDirectory("secret-scanner-tree-");
  const outside = temporaryDirectory("secret-scanner-dir-");
  writeFileSync(join(outside, "hidden.txt"), "outside content", "utf8");
  symlinkSync(outside, join(repository, "linked-directory"), "dir");

  assert.deepEqual(walkRegularFiles(repository), []);
});

test("secret detection still reports regular-file findings", () => {
  const repository = temporaryDirectory("secret-scanner-detect-");
  const nested = join(repository, "nested");
  mkdirSync(nested);
  const secretText = ["client_", "secret = \"", "sensitive-test-value", "\""].join("");
  writeFileSync(join(nested, "config.txt"), secretText, "utf8");

  const findings = scanCurrentTree(repository);
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.type, "credential-assignment");
  assert.equal(findings[0]?.path, "nested/config.txt");
});

test("clean regular input passes", () => {
  const repository = temporaryDirectory("secret-scanner-clean-");
  writeFileSync(join(repository, "clean.txt"), "nothing sensitive here", "utf8");

  assert.deepEqual(scanCurrentTree(repository), []);
});
