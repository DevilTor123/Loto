import Link from "next/link";
import { EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-16">
      <EmptyState title="ไม่พบหน้าที่ต้องการ" action={<Button asChild variant="outline"><Link href="/">กลับหน้าแรก</Link></Button>} />
    </div>
  );
}
