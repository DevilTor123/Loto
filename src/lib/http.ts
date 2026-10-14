/**
 * HTTP client ฝั่ง Backend: Timeout, Retry (exponential backoff), Rate limit ต่อโดเมน
 * Frontend ไม่เรียกเว็บต้นทางโดยตรง — ทุกคำขอผ่านโมดูลนี้บนเซิร์ฟเวอร์เท่านั้น
 */
import { logger } from "./logger";

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly url?: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export interface FetchOptions {
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
  /** ระยะห่างขั้นต่ำระหว่างคำขอไปยังโดเมนเดียวกัน (มิลลิวินาที) */
  minIntervalMs?: number;
}

export const USER_AGENT =
  process.env.FETCH_USER_AGENT ??
  "LottoIntelligenceBot/1.0 (personal statistics; low-frequency polling)";

const lastRequestAt = new Map<string, number>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitForHostSlot(host: string, minIntervalMs: number) {
  const last = lastRequestAt.get(host) ?? 0;
  const wait = last + minIntervalMs - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt.set(host, Date.now());
}

let dispatcherPromise: Promise<unknown> | null = null;
/** ใช้ HTTPS_PROXY ของระบบ (ถ้ามี) — Node fetch ไม่อ่านค่านี้เองโดยอัตโนมัติ */
function getDispatcher(): Promise<unknown> | null {
  if (!process.env.HTTPS_PROXY && !process.env.https_proxy) return null;
  dispatcherPromise ??= import("undici").then((u) => new u.EnvHttpProxyAgent());
  return dispatcherPromise;
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/** ใช้สำหรับทดสอบ: แทนที่ fetch จริงได้ */
let fetchImpl: FetchLike | null = null;
export function setFetchImplementation(impl: FetchLike | null) {
  fetchImpl = impl;
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  opts: FetchOptions = {},
): Promise<Response> {
  const { timeoutMs = 15_000, retries = 2, backoffMs = 1_000, minIntervalMs = 1_000 } = opts;
  const host = new URL(url).host;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    await waitForHostSlot(host, minIntervalMs);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers = new Headers(init.headers);
      if (!headers.has("user-agent")) headers.set("user-agent", USER_AGENT);
      const reqInit: RequestInit & { dispatcher?: unknown } = {
        ...init,
        headers,
        signal: controller.signal,
        cache: "no-store",
      };
      const dispatcher = fetchImpl ? null : getDispatcher();
      if (dispatcher) reqInit.dispatcher = await dispatcher;
      const res = await (fetchImpl ?? (fetch as FetchLike))(url, reqInit);
      if (res.ok) return res;
      const err = new HttpError(`HTTP ${res.status} จาก ${host}`, res.status, url);
      if (!isRetryableStatus(res.status)) throw err;
      lastError = err;
      // 429: เคารพ Retry-After ถ้ามี
      const retryAfter = Number(res.headers.get("retry-after"));
      if (res.status === 429 && retryAfter > 0 && attempt < retries) {
        await sleep(Math.min(retryAfter * 1000, 30_000));
        continue;
      }
    } catch (e) {
      if (e instanceof HttpError && e.status && !isRetryableStatus(e.status)) throw e;
      lastError =
        e instanceof Error && e.name === "AbortError"
          ? new HttpError(`หมดเวลา (${timeoutMs}ms) ขณะเชื่อมต่อ ${host}`, undefined, url)
          : e;
    } finally {
      clearTimeout(timer);
    }
    if (attempt < retries) {
      const delay = backoffMs * 2 ** attempt;
      logger.warn("http.retry", { url, attempt: attempt + 1, delay, error: String(lastError) });
      await sleep(delay);
    }
  }
  if (lastError instanceof HttpError) throw lastError;
  const cause = lastError instanceof Error ? (lastError.cause as Error | undefined) : undefined;
  throw new HttpError(
    `เชื่อมต่อ ${host} ไม่สำเร็จ: ${lastError instanceof Error ? lastError.message : String(lastError)}${
      cause?.message ? ` (${cause.message})` : ""
    }`,
    undefined,
    url,
  );
}
