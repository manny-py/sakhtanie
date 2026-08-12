export function parseMonetizationEnabled(value: string | undefined): boolean {
  return value === "true";
}

export const MONETIZATION_ENABLED = parseMonetizationEnabled(
  import.meta.env?.PUBLIC_MONETIZATION_ENABLED
);
