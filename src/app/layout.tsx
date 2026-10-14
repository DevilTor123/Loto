import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Sarabun } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DemoBanner, OfflineBanner } from "@/components/banners";
import { config } from "@/lib/config";

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sarabun",
  display: "swap",
});
const chakra = Chakra_Petch({
  subsets: ["thai", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-chakra",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  title: { default: "LOTTO INTELLIGENCE — สถิติสลากกินแบ่งรัฐบาล", template: "%s · LOTTO INTELLIGENCE" },
  description:
    "วิเคราะห์สถิติรางวัลที่ 1 สลากกินแบ่งรัฐบาลย้อนหลังจากข้อมูลจริง ความถี่ตัวเลขตามตำแหน่ง และสุ่มหมายเลข 6 หลัก — เพื่อการศึกษาข้อมูล ไม่ใช่การทำนายผล",
  openGraph: { type: "website", locale: "th_TH", siteName: "LOTTO INTELLIGENCE" },
  robots: config.demoMode ? { index: false, follow: false } : undefined,
};

// อ่านค่า DEMO_MODE ตอนรัน (ไม่ใช่ตอน build) เพื่อให้แบนเนอร์โหมดสาธิตแสดงถูกต้องเสมอ
export const dynamic = "force-dynamic";

export const viewport: Viewport = { themeColor: "#0B0F14", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${sarabun.variable} ${chakra.variable}`}>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-1 focus:text-bg">
          ข้ามไปยังเนื้อหา
        </a>
        {config.demoMode && <DemoBanner />}
        <OfflineBanner />
        <SiteHeader />
        <main id="main" className="page-enter mx-auto max-w-7xl px-4 py-6 md:py-8">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
