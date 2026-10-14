import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtPct(n: number, digits = 2) {
  return `${n.toLocaleString("th-TH", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

export function fmtInt(n: number) {
  return n.toLocaleString("th-TH");
}
