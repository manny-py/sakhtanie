import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import {
  evaluateDeploymentStatus,
  validateAncestry,
  validateManualRange,
  type DeploymentRecord,
} from "./deployment-range.ts";
import { resolveGitCommit } from "./git-catalog.ts";

function isAncestor(ancestor: string, descendant: string) {
  try {
    execFileSync(
      "git",
      ["merge-base", "--is-ancestor", ancestor, descendant],
      { stdio: "ignore" }
    );
    return true;
  } catch {
    return false;
  }
}

function validateGitRange(baseSha: string, headSha: string) {
  const base = resolveGitCommit(baseSha);
  const head = resolveGitCommit(headSha);
  const main = resolveGitCommit("origin/main");

  if (
    !validateAncestry({
      headOnMain: isAncestor(head, main),
      baseAncestorOfHead: isAncestor(base, head),
    })
  ) {
    return {
      shouldPlan: false as const,
      reason: "SHA not on main or invalid ancestry",
    };
  }

  return {
    shouldPlan: true as const,
    baseSha: base,
    headSha: head,
  };
}

function readDeployments(path: string) {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as { deployments?: unknown }).deployments)
  ) {
    throw new Error("GitHub deployment API response must contain deployments");
  }
  const history = parsed as {
    complete: boolean;
    deployments: DeploymentRecord[];
    error?: string;
  };
  return history;
}

function main() {
  const mode = process.env.INDEXNOW_MODE;

  if (mode === "workflow_dispatch") {
    const manual = validateManualRange(
      process.env.INDEXNOW_BASE_SHA ?? "",
      process.env.INDEXNOW_HEAD_SHA ?? ""
    );
    console.log(JSON.stringify(validateGitRange(manual.baseSha, manual.headSha)));
    return;
  }

  if (mode !== "deployment_status") {
    throw new Error("INDEXNOW_MODE must be deployment_status or workflow_dispatch");
  }

  const history = readDeployments(process.env.INDEXNOW_DEPLOYMENTS_FILE ?? "");

  if (!history.complete) {
    console.log(JSON.stringify({
      shouldPlan: false,
      reason: history.error ?? "deployment history exceeded the bounded pagination limit",
    }));
    return;
  }

  const decision = evaluateDeploymentStatus({
    deployments: history.deployments,
    currentDeploymentId: process.env.INDEXNOW_DEPLOYMENT_ID ?? "",
    currentSha: process.env.INDEXNOW_DEPLOYMENT_SHA ?? "",
  });

  if (!decision.shouldPlan) {
    console.log(JSON.stringify(decision));
    return;
  }

  console.log(JSON.stringify({
    ...validateGitRange(decision.baseSha, decision.headSha),
    currentDeploymentId: decision.currentDeploymentId,
  }));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
