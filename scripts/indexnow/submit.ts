import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const INDEXNOW_HOST = "sakhtanie.ir";
export const INDEXNOW_ORIGIN = "https://sakhtanie.ir";
export const INDEXNOW_KEY_FILENAME = "09e9b751c2114051929e5edd6b639333.txt";
export const MAX_URLS = 500;
export const MAX_ATTEMPTS = 3;
export const ATTEMPT_TIMEOUT_MS = 10_000;

export interface IndexNowResponse {
  sent: boolean;
  status?: number;
  attempts: number;
  reason?: string;
}

export function isLiveEnabled(value: string | undefined) {
  return value === "true";
}

export function validateIndexNowUrls(urls: readonly string[]) {
  if (urls.length === 0) {
    return [];
  }

  const unique = [...new Set(urls)];
  if (unique.length > MAX_URLS) {
    throw new Error(`IndexNow URL list exceeds the maximum of ${MAX_URLS} URLs.`);
  }

  return unique.map((candidate) => {
    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      throw new Error(`Invalid IndexNow URL: ${candidate}`);
    }

    const authority = candidate.slice("https://".length).split(/[/?#]/, 1)[0] ?? "";
    if (
      parsed.protocol !== "https:" ||
      parsed.origin !== INDEXNOW_ORIGIN ||
      parsed.username !== "" ||
      parsed.password !== "" ||
      authority.includes(":") ||
      parsed.search !== "" ||
      parsed.hash !== "" ||
      !(
        parsed.pathname === "/" ||
        /^\/(?:tools|categories)\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(parsed.pathname)
      )
    ) {
      throw new Error(`IndexNow URL is outside the approved planner routes: ${candidate}`);
    }

    return parsed.toString();
  });
}

export function validateIndexNowKeyFile(
  filePath = resolve("public", INDEXNOW_KEY_FILENAME)
) {
  const expectedKey = INDEXNOW_KEY_FILENAME.slice(0, -4);
  if (basename(filePath) !== INDEXNOW_KEY_FILENAME) {
    throw new Error(`IndexNow key filename must be ${INDEXNOW_KEY_FILENAME}.`);
  }

  let content: string;
  try {
    content = readFileSync(filePath, "utf8");
  } catch (error) {
    throw new Error(`IndexNow key file is missing or unreadable: ${filePath}`, {
      cause: error,
    });
  }

  if (content !== expectedKey) {
    throw new Error("IndexNow key file content does not match its filename.");
  }

  return expectedKey;
}

function retryAfterMs(response: Response) {
  const value = response.headers.get("retry-after");
  if (!value) return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, ATTEMPT_TIMEOUT_MS);
  }

  const date = Date.parse(value);
  if (Number.isNaN(date)) return undefined;
  return Math.min(Math.max(0, date - Date.now()), ATTEMPT_TIMEOUT_MS);
}

function isRetryableStatus(status: number) {
  return status === 429 || (status >= 500 && status <= 599);
}

export async function submitIndexNow(input: {
  urls: readonly string[];
  liveEnabled: string | undefined;
  keyFilePath?: string;
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
}): Promise<IndexNowResponse> {
  const urls = validateIndexNowUrls(input.urls);
  if (urls.length === 0) {
    return { sent: false, attempts: 0, reason: "zero impacted URLs" };
  }

  if (!isLiveEnabled(input.liveEnabled)) {
    return { sent: false, attempts: 0, reason: "live switch disabled" };
  }

  const key = validateIndexNowKeyFile(input.keyFilePath);
  const fetchImpl = input.fetchImpl ?? fetch;
  const sleep = input.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  let attempts = 0;

  for (; attempts < MAX_ATTEMPTS; attempts += 1) {
    const attemptNumber = attempts + 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);

    try {
      const response = await fetchImpl(INDEXNOW_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ host: INDEXNOW_HOST, key, urlList: urls }),
        signal: controller.signal,
      });

      if (response.status === 200 || response.status === 202) {
        return { sent: true, status: response.status, attempts: attemptNumber };
      }

      if (!isRetryableStatus(response.status)) {
        return { sent: false, status: response.status, attempts: attemptNumber, reason: "permanent IndexNow response" };
      }

      if (attempts + 1 >= MAX_ATTEMPTS) break;
      const delay = retryAfterMs(response) ?? 250 * 2 ** attempts;
      await sleep(delay);
    } catch (error) {
      if (attempts + 1 >= MAX_ATTEMPTS) break;
      await sleep(250 * 2 ** attempts);
      if (error instanceof Error) continue;
    } finally {
      clearTimeout(timeout);
    }
  }

  return { sent: false, attempts: MAX_ATTEMPTS, reason: "retry limit exhausted" };
}
