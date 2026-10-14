"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Dices, History, Info, LayoutDashboard, Percent, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/history", label: "ประวัติผล", icon: History },
  { href: "/statistics", label: "สถิติ", icon: BarChart3 },
  { href: "/check", label: "ตรวจเลข", icon: Percent },
  { href: "/random", label: "สุ่มเลข", icon: Dices },
  { href: "/sync", label: "ประวัติซิงก์", icon: RefreshCcw },
  { href: "/about", label: "วิธีการ", icon: Info },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="flex items-center gap-2.5" aria-label="LOTTO INTELLIGENCE หน้าแรก">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-primary/50 bg-primary/10 font-[family-name:var(--font-display)] text-sm font-bold text-primary">
            LI
          </span>
          <span className="font-[family-name:var(--font-display)] text-base font-semibold tracking-[0.18em] text-text">
            LOTTO <span className="text-primary">INTELLIGENCE</span>
          </span>
        </Link>
        <nav aria-label="เมนูหลัก" className="scrollbar-none -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <ul className="flex gap-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors",
                      active ? "bg-primary/12 text-primary" : "text-muted hover:bg-surface-2 hover:text-text",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
