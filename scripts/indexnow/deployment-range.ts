export interface DeploymentRecord {
  id: string;
  sha: string;
  environment?: string | null;
  state?: string | null;
  created_at: string;
}

export interface DeploymentRange {
  shouldPlan: true;
  baseSha: string;
  headSha: string;
  currentDeploymentId?: string;
}

export interface SkipDecision {
  shouldPlan: false;
  reason: string;
}

export type RangeDecision = DeploymentRange | SkipDecision;

export function isFullSha(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);
}

export function isEligibleProductionDeployment(
  deployment: DeploymentRecord
) {
  return (
    deployment.environment === "Production" &&
    deployment.state === "success" &&
    isFullSha(deployment.sha)
  );
}

export function eventQualifiesForPlanning(event: {
  environment?: string | null;
  state?: string | null;
}) {
  return event.environment === "Production" && event.state === "success";
}

function compareNewest(left: DeploymentRecord, right: DeploymentRecord) {
  const timeOrder = right.created_at.localeCompare(left.created_at);
  if (timeOrder !== 0) {
    return timeOrder;
  }

  return right.id.localeCompare(left.id, "en");
}

export function successfulProductionDeployments(
  deployments: readonly DeploymentRecord[]
) {
  return deployments
    .filter(isEligibleProductionDeployment)
    .sort(compareNewest);
}

export function selectLatestSuccessfulProduction(
  deployments: readonly DeploymentRecord[]
) {
  return successfulProductionDeployments(deployments)[0];
}

export function selectPreviousDistinctProduction(
  deployments: readonly DeploymentRecord[],
  currentDeploymentId: string
) {
  const successful = successfulProductionDeployments(deployments);
  const currentIndex = successful.findIndex(
    (deployment) => deployment.id === currentDeploymentId
  );
  const current = successful[currentIndex];

  if (!current || currentIndex < 0) {
    return undefined;
  }

  return successful
    .slice(currentIndex + 1)
    .find((deployment) => deployment.sha !== current.sha);
}

export function evaluateDeploymentStatus(input: {
  deployments: readonly DeploymentRecord[];
  currentDeploymentId: string;
  currentSha: string;
}): RangeDecision {
  const successful = successfulProductionDeployments(input.deployments);
  const current = successful.find(
    (deployment) => deployment.id === input.currentDeploymentId
  );

  if (!current || current.sha !== input.currentSha) {
    return {
      shouldPlan: false,
      reason: "stale production event or deployment SHA mismatch",
    };
  }

  if (successful[0]?.id !== input.currentDeploymentId) {
    return {
      shouldPlan: false,
      reason: "stale production event",
    };
  }

  const previous = selectPreviousDistinctProduction(
    successful,
    input.currentDeploymentId
  );

  if (!previous) {
    return {
      shouldPlan: false,
      reason: "no previous successful Production deployment",
    };
  }

  return {
    shouldPlan: true,
    baseSha: previous.sha,
    headSha: current.sha,
    currentDeploymentId: current.id,
  };
}

export function validateManualRange(baseSha: string, headSha: string) {
  if (!isFullSha(baseSha) || !isFullSha(headSha)) {
    throw new Error("manual base_sha and head_sha must each be exactly 40 hexadecimal characters");
  }

  return { baseSha, headSha };
}

export function validateAncestry(input: {
  headOnMain: boolean;
  baseAncestorOfHead: boolean;
}) {
  return input.headOnMain && input.baseAncestorOfHead;
}
