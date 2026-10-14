"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { StatsResult, WindowKey } from "@/lib/stats";

export interface StatsFilter {
  window: WindowKey;
  from?: string;
  to?: string;
}

export function useStats(filter: StatsFilter, initial?: StatsResult | null) {
  const [data, setData] = useState<StatsResult | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);
  const first = useRef(Boolean(initial));
  const key = `${filter.window}|${filter.from ?? ""}|${filter.to ?? ""}`;

  const load = useCallback(async () => {
    if (filter.window === "custom" && !filter.from && !filter.to) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ window: filter.window });
      if (filter.window === "custom") {
        if (filter.from) qs.set("from", filter.from);
        if (filter.to) qs.set("to", filter.to);
      }
      const res = await fetch(`/api/stats?${qs}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body?.issues?.join(", ") || body?.error || `HTTP ${res.status}`);
      setData(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดสถิติไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (first.current && filter.window === "all") {
      first.current = false;
      return;
    }
    first.current = false;
    void load();
  }, [load, filter.window]);

  return { data, loading, error, reload: load };
}
