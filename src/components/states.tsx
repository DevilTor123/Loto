import { AlertTriangle, Database, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-10 text-center">
      <Database className="size-8 text-muted" aria-hidden />
      <p className="font-medium text-text">{title}</p>
      {description && <div className="max-w-md text-sm text-muted">{description}</div>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-danger/40 bg-danger/5 px-6 py-8 text-center">
      <AlertTriangle className="size-7 text-danger" aria-hidden />
      <p className="text-sm text-text">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          ลองใหม่
        </Button>
      )}
    </div>
  );
}

export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="กำลังโหลด">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted">
      <Loader2 className="size-4 animate-spin" aria-hidden /> {label}
    </span>
  );
}
