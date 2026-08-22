export function parseMonetizationEnabled(value: string | undefined): boolean {
  return value === "true";
}

export const QA_SPONSOR_FIXTURE_ENABLED = true;

export const MONETIZATION_ENABLED = parseMonetizationEnabled(
  import.meta.env?.PUBLIC_MONETIZATION_ENABLED
) || QA_SPONSOR_FIXTURE_ENABLED;
