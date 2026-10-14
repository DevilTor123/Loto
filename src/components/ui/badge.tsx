import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium [&_svg]:size-3", {
  variants: {
    variant: {
      default: "border-primary/40 bg-primary/10 text-primary",
      success: "border-success/40 bg-success/10 text-success",
      warning: "border-warning/40 bg-warning/10 text-warning",
      danger: "border-danger/40 bg-danger/10 text-danger",
      muted: "border-border bg-surface-2 text-muted",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
