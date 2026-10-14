import { cn } from "@/lib/utils";

/** แสดงหมายเลข 6 หลักแบบช่องตัวเลข — รับเป็น string เสมอ */
export function NumberDisplay({
  value,
  size = "md",
  animate = false,
  className,
}: {
  value: string;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
  className?: string;
}) {
  const box = {
    sm: "h-8 w-6 text-base rounded-md",
    md: "h-11 w-8 text-2xl rounded-lg",
    lg: "h-14 w-10 text-3xl sm:h-16 sm:w-12 sm:text-4xl rounded-xl",
  }[size];
  return (
    <span className={cn("inline-flex gap-1", className)} aria-label={`หมายเลข ${value.split("").join(" ")}`} role="img">
      {value.split("").map((d, i) => (
        <span
          key={`${value}-${i}`}
          aria-hidden
          className={cn(
            "num grid place-items-center border border-primary/35 bg-gradient-to-b from-[#1d2631] to-[#111820] font-semibold text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
            box,
            animate && "digit-roll",
          )}
          style={animate ? { animationDelay: `${i * 55}ms` } : undefined}
        >
          {d}
        </span>
      ))}
    </span>
  );
}
