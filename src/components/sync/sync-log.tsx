"use client";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { formatThaiDate, formatThaiDateTime } from "@/lib/thai-date";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Table, TBody, TD, TH, THead, TR } from "../ui/table";
import { EmptyState, ErrorState, LoadingRows } from "../states";

interface Change {
  id: number;
  drawDate: string;
  action: "ADDED" | "UPDATED" | "VERIFIED" | "CONFLICT";
  oldNumber: string | null;
  newNumber: string | null;
  sourceName: string;
  sourceUrl: string | null;
  note: string | null;
}
interface Log {
  id: number;
  sourceName: string;
  trigger: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  recordsAdded: number;
  recordsUpdated: number;
  recordsConflict: number;
  errorMessage: string | null;
  details: { attempts?: { source: string; ok: boolean; pages?: number; draws?: number; error?: string; durationMs: number }[]; message?: string } | null;
  changes: Change[];
}

const STATUS: Record<string, { label: string; variant: "success" | "warning" | "danger" | "muted" | "default" }> = {
  SUCCESS: { label: "สำเร็จ (มีข้อมูลใหม่)", variant: "success" },
  NO_CHANGE: { label: "สำเร็จ (ไม่มีงวดใหม่)", variant: "muted" },
  PARTIAL: { label: "สำเร็จบางส่วน", variant: "warning" },
  FAILED: { label: "ล้มเหลว", variant: "danger" },
  RUNNING: { label: "กำลังทำงาน", variant: "default" },
  SKIPPED: { label: "ข้าม", variant: "muted" },
};
const ACTION: Record<Change["action"], string> = { ADDED: "เพิ่ม", UPDATED: "แก้ไข", VERIFIED: "ยืนยัน", CONFLICT: "ขัดแย้ง/รอตรวจสอบ" };
const TRIGGER: Record<string, string> = { cron: "ตามเวลา", manual: "กดอัปเดต", cli: "คำสั่ง", backfill: "ดึงย้อนหลัง" };

export function SyncLogList() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; pages: number; items: Log[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sync-logs?page=${page}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [page]);
  useEffect(() => void load(), [load]);

  if (error) return <ErrorState message={`โหลดประวัติการซิงก์ไม่สำเร็จ: ${error}`} onRetry={load} />;
  if (loading && !data) return <LoadingRows rows={6} />;
  if (!data || data.items.length === 0) return <EmptyState title="ยังไม่มีประวัติการซิงก์" />;

  return (
    <div className="space-y-3">
      {data.items.map((l) => {
        const s = STATUS[l.status] ?? { label: l.status, variant: "muted" as const };
        return (
          <Card key={l.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={s.variant}>{s.label}</Badge>
                  <span className="text-sm text-text">{formatThaiDateTime(l.startedAt)}</span>
                  <span className="text-xs text-muted">· {TRIGGER[l.trigger] ?? l.trigger} · #{l.id}</span>
                </div>
                <p className="text-xs text-muted">
                  เพิ่ม <span className="num text-text">{l.recordsAdded}</span> · แก้ไข/ยืนยัน <span className="num text-text">{l.recordsUpdated}</span> ·
                  ขัดแย้ง <span className="num text-text">{l.recordsConflict}</span>
                  {l.finishedAt && <> · ใช้เวลา {((Date.parse(l.finishedAt) - Date.parse(l.startedAt)) / 1000).toFixed(1)} วินาที</>}
                </p>
              </div>
              {l.details?.message && <p className="text-sm text-muted">{l.details.message}</p>}
              {l.details?.attempts && l.details.attempts.length > 0 && (
                <ul className="space-y-1 text-xs">
                  {l.details.attempts.map((a, i) => (
                    <li key={i} className={a.ok ? "text-success" : "text-danger"}>
                      {a.source}: {a.ok ? `เชื่อมต่อได้ (${a.pages ?? 0} คำขอ, พบ ${a.draws ?? 0} งวด)` : a.error}
                    </li>
                  ))}
                </ul>
              )}
              {l.changes.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-sm text-primary">ดูรายการที่เปลี่ยนแปลง ({l.changes.length})</summary>
                  <Table className="mt-2 text-xs">
                    <THead>
                      <TR>
                        <TH>งวด</TH>
                        <TH>การกระทำ</TH>
                        <TH>เดิม</TH>
                        <TH>ใหม่</TH>
                        <TH>แหล่งที่มา</TH>
                        <TH>หมายเหตุ</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {l.changes.map((c) => (
                        <TR key={c.id}>
                          <TD className="whitespace-nowrap">{formatThaiDate(c.drawDate, true)}</TD>
                          <TD>{ACTION[c.action]}</TD>
                          <TD className="num">{c.oldNumber ?? "—"}</TD>
                          <TD className="num text-primary">{c.newNumber ?? "—"}</TD>
                          <TD>
                            {c.sourceUrl ? (
                              <a className="inline-flex items-center gap-1 underline-offset-2 hover:underline" href={c.sourceUrl} target="_blank" rel="noopener noreferrer">
                                {c.sourceName} <ExternalLink className="size-3" aria-hidden />
                              </a>
                            ) : (
                              c.sourceName
                            )}
                          </TD>
                          <TD className="text-muted">{c.note ?? ""}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </details>
              )}
            </CardContent>
          </Card>
        );
      })}
      <nav aria-label="เปลี่ยนหน้า" className="flex items-center justify-between">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft aria-hidden /> ใหม่กว่า</Button>
        <span className="text-sm text-muted">หน้า {page} จาก {data.pages}</span>
        <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>เก่ากว่า <ChevronRight aria-hidden /></Button>
      </nav>
    </div>
  );
}
