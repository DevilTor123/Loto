"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, CircleDashed, Clock, ExternalLink, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import type { AppStatus } from "@/lib/data";
import { formatThaiDate, formatThaiDateTime } from "@/lib/thai-date";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { NumberDisplay } from "../number-display";

type SyncResult = { status: string; message: string } | null;

export function StatusPanel({ status }: { status: AppStatus }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult>(null);
  const [, startTransition] = useTransition();

  async function sync() {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      setResult({ status: body.status ?? (res.ok ? "OK" : "FAILED"), message: body.message ?? body.error ?? `HTTP ${res.status}` });
      startTransition(() => router.refresh());
    } catch {
      setResult({ status: "FAILED", message: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ — ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต" });
    } finally {
      setSyncing(false);
    }
  }

  const { latestDraw, freshness, lastAttempt } = status;
  const lastFailed = lastAttempt && lastAttempt.status === "FAILED";
  const sourceLink = latestDraw?.sourceUrl ?? status.sources[0].url;

  return (
    <Card className="overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[1.2fr_1fr]">
        <div className="relative border-b border-border p-5 lg:border-b-0 lg:border-r">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
          <p className="text-sm text-muted">รางวัลที่ 1 งวดล่าสุดในฐานข้อมูล</p>
          {latestDraw ? (
            <>
              <p className="mt-1 text-lg text-text">{formatThaiDate(latestDraw.drawDate)}</p>
              <div className="mt-4">
                <NumberDisplay value={latestDraw.number} size="lg" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {latestDraw.status === "VERIFIED" ? (
                  <Badge variant="success"><ShieldCheck /> ยืนยันกับ GLO แล้ว</Badge>
                ) : (
                  <Badge variant="muted"><CircleDashed /> จาก {latestDraw.sourceName} (ยังไม่ได้ยืนยันกับ GLO)</Badge>
                )}
              </div>
            </>
          ) : (
            <p className="mt-4 text-muted">ยังไม่มีข้อมูลงวดในฐานข้อมูล</p>
          )}
        </div>

        <div className="space-y-4 p-5">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted">งวดทั้งหมดในฐานข้อมูล</dt>
              <dd className="num mt-0.5 text-2xl font-semibold text-text">{status.totalDraws.toLocaleString("th-TH")}</dd>
              {status.conflictDraws > 0 && <dd className="text-xs text-warning">รอตรวจสอบ {status.conflictDraws} งวด (ไม่นำมาคำนวณ)</dd>}
            </div>
            <div>
              <dt className="text-muted">ยืนยันกับ GLO แล้ว</dt>
              <dd className="num mt-0.5 text-2xl font-semibold text-text">{status.verifiedDraws.toLocaleString("th-TH")}</dd>
            </div>
            <div className="col-span-2">
              <dt className="flex items-center gap-1 text-muted"><Clock className="size-3.5" aria-hidden /> ซิงก์สำเร็จล่าสุด</dt>
              <dd className="mt-0.5 text-text">{status.lastSuccessfulSyncAt ? formatThaiDateTime(status.lastSuccessfulSyncAt) : "ยังไม่เคยซิงก์สำเร็จ"}</dd>
            </div>
          </dl>

          <div>
            <p className="mb-1.5 text-xs text-muted">สถานะการเชื่อมต่อแหล่งข้อมูล (จากการซิงก์ครั้งล่าสุด)</p>
            <ul className="space-y-1.5">
              {status.sources.map((s) => (
                <li key={s.name} className="flex items-start justify-between gap-2 text-sm">
                  <span className="text-text">
                    {s.name} <span className="text-xs text-muted">· {s.role}</span>
                  </span>
                  {s.state === "ok" && <Badge variant="success"><CheckCircle2 /> เชื่อมต่อได้</Badge>}
                  {s.state === "error" && <Badge variant="danger" title={s.error ?? undefined}><XCircle /> ล้มเหลว</Badge>}
                  {s.state === "not-used" && <Badge variant="muted">ไม่ได้เรียกใช้</Badge>}
                  {s.state === "unknown" && <Badge variant="muted">ยังไม่ทราบ</Badge>}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={sync} disabled={syncing || status.demoMode} aria-busy={syncing}>
              <RefreshCw className={syncing ? "animate-spin" : ""} aria-hidden />
              {syncing ? "กำลังตรวจสอบแหล่งข้อมูล…" : "อัปเดตข้อมูล"}
            </Button>
            <Button asChild variant="outline">
              <a href={sourceLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden /> ดูแหล่งข้อมูลต้นฉบับ
              </a>
            </Button>
          </div>
          {result && (
            <p
              role="status"
              className={
                result.status === "FAILED"
                  ? "text-sm text-danger"
                  : result.status === "SUCCESS"
                    ? "text-sm text-success"
                    : "text-sm text-muted"
              }
            >
              {result.message}
            </p>
          )}
        </div>
      </div>

      {(freshness.state === "stale" || freshness.state === "awaiting" || lastFailed) && (
        <div
          role="alert"
          className={`flex items-start gap-2 border-t px-5 py-3 text-sm ${
            freshness.state === "stale" || lastFailed ? "border-warning/30 bg-warning/10 text-warning" : "border-border bg-surface-2/60 text-muted"
          }`}
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="space-y-1">
            {freshness.state === "stale" && (
              <p>
                ข้อมูลอาจยังไม่เป็นปัจจุบัน: ควรมีผลงวด {formatThaiDate(freshness.expected)} แล้ว แต่ยังไม่พบในฐานข้อมูล
              </p>
            )}
            {freshness.state === "awaiting" && (
              <p>รอผลงวด {formatThaiDate(freshness.expected)} — ระบบจะตรวจซ้ำอัตโนมัติ (บางงวดอาจเลื่อนวันออกรางวัล)</p>
            )}
            {lastFailed && (
              <p>
                การซิงก์ครั้งล่าสุด ({formatThaiDateTime(lastAttempt!.startedAt)}) ล้มเหลว: {lastAttempt!.errorMessage ?? lastAttempt!.message} —
                {status.totalDraws > 0 ? "กำลังแสดงข้อมูลล่าสุดที่บันทึกไว้" : "ยังไม่มีข้อมูลที่บันทึกไว้"}
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
