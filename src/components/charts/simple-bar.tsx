"use client";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartTheme } from "./theme";

export interface SimpleBarDatum {
  label: string;
  value: number;
  pct?: number;
  highlight?: boolean;
}

/** กราฟแท่งชุดข้อมูลเดียว — แท่งที่ highlight ใช้สีทองเต็ม ที่เหลือสีทองจาง */
export function SimpleBar({
  data,
  height = 240,
  valueLabel = "จำนวนครั้ง",
  legendLabel,
  ariaLabel,
  xLabel,
}: {
  data: SimpleBarDatum[];
  height?: number;
  valueLabel?: string;
  legendLabel?: string;
  ariaLabel: string;
  xLabel?: string;
}) {
  const anyHighlight = data.some((d) => d.highlight);
  return (
    <div role="img" aria-label={ariaLabel} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: xLabel ? 18 : 0, left: -16 }} barCategoryGap="18%">
          <CartesianGrid vertical={false} stroke={chartTheme.grid} />
          <XAxis
            dataKey="label"
            tick={{ fill: chartTheme.axis, fontSize: 12 }}
            axisLine={{ stroke: chartTheme.grid }}
            tickLine={false}
            interval="preserveStartEnd"
            label={xLabel ? { value: xLabel, position: "insideBottom", offset: -10, fill: chartTheme.axis, fontSize: 12 } : undefined}
          />
          <YAxis allowDecimals={false} tick={{ fill: chartTheme.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            {...chartTheme.tooltip}
            formatter={(v: number, _n, item) => {
              const pct = (item?.payload as SimpleBarDatum | undefined)?.pct;
              return [`${v.toLocaleString("th-TH")}${pct !== undefined ? ` (${pct.toFixed(2)}%)` : ""}`, valueLabel];
            }}
          />
          {legendLabel && <Legend wrapperStyle={{ fontSize: 12, color: chartTheme.axis }} />}
          <Bar dataKey="value" name={legendLabel ?? valueLabel} radius={[4, 4, 0, 0]} fill={chartTheme.primary} maxBarSize={44}>
            {data.map((d, i) => (
              <Cell key={i} fill={!anyHighlight || d.highlight ? chartTheme.primary : chartTheme.primaryDim} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
