/** Integration tests: HTTP layer + provider จริง โดยจำลองเครือข่ายด้วย fetch ปลอม */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { fetchWithRetry, HttpError, setFetchImplementation } from "@/lib/http";
import { LotteryCoThProvider } from "@/lib/providers/lottery-co-th";
import { GloProvider, GLO } from "@/lib/providers/glo";
import { ParseError } from "@/lib/providers/types";

const html = readFileSync(path.join(__dirname, "../fixtures/previous-page.html"), "utf8");
afterEach(() => setFetchImplementation(null));

const fast = { backoffMs: 1, minIntervalMs: 0 };

describe("fetchWithRetry", () => {
  it("retry เมื่อได้ 5xx แล้วสำเร็จ", async () => {
    let n = 0;
    setFetchImplementation(async () => (++n < 3 ? new Response("err", { status: 503 }) : new Response("ok")));
    const res = await fetchWithRetry("https://a.example/x", {}, { ...fast, retries: 3 });
    expect(await res.text()).toBe("ok");
    expect(n).toBe(3);
  });

  it("ไม่ retry เมื่อได้ 404", async () => {
    let n = 0;
    setFetchImplementation(async () => (n++, new Response("nf", { status: 404 })));
    await expect(fetchWithRetry("https://a.example/x", {}, { ...fast, retries: 3 })).rejects.toMatchObject({ status: 404 });
    expect(n).toBe(1);
  });

  it("timeout → HttpError พร้อมข้อความภาษาไทย", async () => {
    setFetchImplementation(
      (_url, init) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
        }),
    );
    const err = await fetchWithRetry("https://slow.example/", {}, { ...fast, retries: 1, timeoutMs: 30 }).catch((e) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err.message).toContain("หมดเวลา");
  });

  it("network error ทุกครั้ง → โยน HttpError หลังครบจำนวน retry", async () => {
    let n = 0;
    setFetchImplementation(async () => {
      n++;
      throw new TypeError("fetch failed");
    });
    await expect(fetchWithRetry("https://down.example/", {}, { ...fast, retries: 2 })).rejects.toBeInstanceOf(HttpError);
    expect(n).toBe(3);
  });

  it("rate limit: เว้นระยะคำขอไปยังโดเมนเดียวกัน", async () => {
    const times: number[] = [];
    setFetchImplementation(async () => (times.push(Date.now()), new Response("ok")));
    await fetchWithRetry("https://rl.example/1", {}, { minIntervalMs: 80 });
    await fetchWithRetry("https://rl.example/2", {}, { minIntervalMs: 80 });
    expect(times[1] - times[0]).toBeGreaterThanOrEqual(70);
  });
});

describe("Providers ผ่าน HTTP", () => {
  it("LotteryCoThProvider ดึงและแยกข้อมูล + ส่ง User-Agent", async () => {
    let ua = "";
    setFetchImplementation(async (url, init) => {
      ua = new Headers(init?.headers).get("user-agent") ?? "";
      expect(url).toBe("https://www.lottery.co.th/previous/page/2");
      return new Response(html, { headers: { "content-type": "text/html" } });
    });
    const res = await new LotteryCoThProvider().fetchPage(2);
    expect(res.draws[0].firstPrize).toBe("402701");
    expect(ua).toContain("LottoIntelligenceBot");
  });

  it("หน้าเว็บเปลี่ยนโครงสร้าง → ParseError", async () => {
    setFetchImplementation(async () => new Response("<html><body>new design</body></html>"));
    await expect(new LotteryCoThProvider().fetchPage(1)).rejects.toBeInstanceOf(ParseError);
  });

  it("GloProvider ส่ง POST ตามรูปแบบเอกสาร GLO", async () => {
    let body = "";
    let method = "";
    setFetchImplementation(async (url, init) => {
      expect(url).toBe(GLO.resultApi);
      method = String(init?.method);
      body = String(init?.body);
      return Response.json({ response: { result: { data: { first: { number: [{ value: "004615" }] } } } } });
    });
    const d = await new GloProvider().fetchByDate("2026-08-16");
    expect(method).toBe("POST");
    expect(JSON.parse(body)).toEqual({ date: "16", month: "08", year: "2026" });
    expect(d?.firstPrize).toBe("004615");
  });

  it("GLO ตอบไม่ใช่ JSON → ParseError", async () => {
    setFetchImplementation(async () => new Response("<html>blocked</html>"));
    await expect(new GloProvider().fetchByDate("2026-08-16")).rejects.toBeInstanceOf(ParseError);
  });
});
