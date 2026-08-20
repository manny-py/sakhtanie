import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("live workflow is deployment-status-only, read-only, and full-checkout", () => {
  const workflow = readFileSync(".github/workflows/indexnow-submit.yml", "utf8");
  assert.match(workflow, /deployment_status:/);
  assert.doesNotMatch(workflow, /workflow_dispatch:/);
  assert.match(workflow, /contents:\s*read/);
  assert.match(workflow, /deployments:\s*read/);
  assert.doesNotMatch(workflow, /contents:\s*write|deployments:\s*write/);
  assert.match(workflow, /environment: 'Production'/);
  assert.match(workflow, /DEPLOYMENT_STATE.*github\.event\.deployment_status\.state/);
  assert.match(workflow, /fetch-depth:\s*0/);
  assert.match(workflow, /persist-credentials:\s*false/);
  assert.match(workflow, /vars\.INDEXNOW_LIVE_ENABLED == 'true'/);
  assert.match(workflow, /npm run indexnow:plan/);
});
