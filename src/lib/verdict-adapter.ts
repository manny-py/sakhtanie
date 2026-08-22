import type { Verdict } from "../types/app";

export type VerdictState = "build" | "kinda" | "no";

export function toVerdictState(value: Verdict): VerdictState {
  switch (value) {
    case "yes":
      return "build";
    case "kinda":
      return "kinda";
    case "no":
      return "no";
    default: {
      const exhaustiveValue: never = value;
      return exhaustiveValue;
    }
  }
}
