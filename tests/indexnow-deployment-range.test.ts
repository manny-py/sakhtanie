import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  evaluateDeploymentStatus,
  eventQualifiesForPlanning,
  isEligibleProductionDeployment,
  selectLatestSuccessfulProduction,
  selectPreviousDistinctProduction,
  validateAncestry,
  validateManualRange,
  type DeploymentRecord,
} from "../scripts/indexnow/deployment-range.ts";

const sha = (character: string) => character.repeat(40);

function deployment(
  id: string,
  commit: string,
  createdAt: string,
  environment = "Production",
  state = "success"
): DeploymentRecord {
  return {
    id,
    sha: commit,
    created_at: createdAt,
    environment,
    state,
  };
}

test("preview success is ineligible", () => {
  assert.equal(
    eventQualifiesForPlanning({ environment: "Preview", state: "success" }),
    false
  );
});

test("Production pending is ineligible", () => {
  assert.equal(
    eventQualifiesForPlanning({ environment: "Production", state: "pending" }),
    false
  );
});

test("Production failure is ineligible", () => {
  assert.equal(
    eventQualifiesForPlanning({ environment: "Production", state: "failure" }),
    false
  );
});

test("Production success is eligible", () => {
  const item = deployment("1", sha("a"), "2026-08-15T10:00:00Z");
  assert.equal(eventQualifiesForPlanning(item), true);
  assert.equal(isEligibleProductionDeployment(item), true);
});

test("newest successful Production deployment is selected", () => {
  const latest = deployment("2", sha("b"), "2026-08-15T11:00:00Z");
  assert.equal(
    selectLatestSuccessfulProduction([
      deployment("1", sha("a"), "2026-08-15T10:00:00Z"),
      latest,
    ])?.id,
    "2"
  );
});

test("stale successful Production event is skipped", () => {
  const decision = evaluateDeploymentStatus({
    currentDeploymentId: "1",
    currentSha: sha("a"),
    deployments: [
      deployment("2", sha("b"), "2026-08-15T11:00:00Z"),
      deployment("1", sha("a"), "2026-08-15T10:00:00Z"),
    ],
  });
  assert.deepEqual(decision, {
    shouldPlan: false,
    reason: "stale production event",
  });
});

test("previous distinct successful Production SHA is selected", () => {
  const deployments = [
    deployment("3", sha("c"), "2026-08-15T12:00:00Z"),
    deployment("2", sha("b"), "2026-08-15T11:00:00Z"),
    deployment("1", sha("a"), "2026-08-15T10:00:00Z"),
  ];
  assert.equal(selectPreviousDistinctProduction(deployments, "3")?.sha, sha("b"));
});

test("duplicate deployment SHA is ignored when selecting the baseline", () => {
  const deployments = [
    deployment("3", sha("b"), "2026-08-15T12:00:00Z"),
    deployment("2", sha("b"), "2026-08-15T11:00:00Z"),
    deployment("1", sha("a"), "2026-08-15T10:00:00Z"),
  ];
  assert.equal(selectPreviousDistinctProduction(deployments, "3")?.id, "1");
});

test("missing prior Production deployment is a safe skip", () => {
  const decision = evaluateDeploymentStatus({
    currentDeploymentId: "1",
    currentSha: sha("a"),
    deployments: [deployment("1", sha("a"), "2026-08-15T10:00:00Z")],
  });
  assert.deepEqual(decision, {
    shouldPlan: false,
    reason: "no previous successful Production deployment",
  });
});

test("manual malformed SHA is rejected", () => {
  assert.throws(
    () => validateManualRange("not-a-sha", sha("b")),
    /exactly 40 hexadecimal/
  );
});

test("manual full SHA values are accepted", () => {
  assert.deepEqual(validateManualRange(sha("a"), sha("b")), {
    baseSha: sha("a"),
    headSha: sha("b"),
  });
});

test("base must be an ancestor of head", () => {
  assert.equal(
    validateAncestry({ headOnMain: true, baseAncestorOfHead: true }),
    true
  );
  assert.equal(
    validateAncestry({ headOnMain: true, baseAncestorOfHead: false }),
    false
  );
});

test("workflow is read-only and uses the existing dry-run planner", () => {
  const workflow = readFileSync(
    ".github/workflows/indexnow-dry-run.yml",
    "utf8"
  );

  assert.match(workflow, /deployment_status:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /contents:\s*read/);
  assert.match(workflow, /deployments:\s*read/);
  assert.doesNotMatch(workflow, /contents:\s*write|deployments:\s*write/);
  assert.match(workflow, /fetch-depth:\s*0/);
  assert.match(workflow, /persist-credentials:\s*false/);
  assert.match(workflow, /npm run indexnow:plan/);
  assert.match(workflow, /const maxPages = 5/);
  assert.match(workflow, /const perPage = 100/);
  assert.match(workflow, /deployment history exceeded 5 pages/);
  assert.match(workflow, /latestStatus\?\.state === 'success'/);
  assert.doesNotMatch(workflow, /production_environment/);
});

test("new workflow contains no IndexNow submission endpoint", () => {
  const workflow = readFileSync(
    ".github/workflows/indexnow-dry-run.yml",
    "utf8"
  );
  assert.doesNotMatch(
    workflow,
    /api\.indexnow\.org|keyLocation|urlList|Bing submission|search-engine notification request|method:\s*POST/i
  );
});
