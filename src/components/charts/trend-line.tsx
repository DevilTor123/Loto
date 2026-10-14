"use client";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartTheme } from "./theme";

export function TrendLine({
  data,
  seriesName,
  ariaLabel,
  reference,
}: {
  data: { label: string; value: number; n: number }[];
  seriesName: string;
  ariaLabel: string;
  reference?: { value: number; label: string };
}) {
  return (
    <div role="img" aria-label={ariaLabel} className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
          <CartesianGrid vertical={false} stroke={chartTheme.grid} />
          <XAxis dataKey="label" tick={{ fill: chartTheme.axis, fontSize: 12 }} tickLine={false} axisLine={{ stroke: chartTheme.grid }} />
          <YAxis tick={{ fill: chartTheme.axis, fontSize: 12 }} axisLine={false} tickLine={false} unit="%" domain={[0, "auto"]} />
          <Tooltip
            {...chartTheme.tooltip}
            cursor={{ stroke: chartTheme.axis, strokeDasharray: "3 3" }}
            formatter={(v: number, _n, item) => [`${v.toFixed(2)}% (จาก ${(item.payload as { n: number }).n} งวด)`, seriesName]}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: chartTheme.axis }} />
          {reference && (
            <ReferenceLine
              y={reference.value}
              stroke={chartTheme.axis}
              strokeDasharray="4 4"
              label={{ value: reference.label, fill: chartTheme.axis, fontSize: 11, position: "insideTopRight" }}
            />
          )}
          <Line type="linear" dataKey="value" name={seriesName} stroke={chartTheme.primary} strokeWidth={2} dot={{ r: 4, fill: chartTheme.primary, stroke: "#131A23", strokeWidth: 2 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
