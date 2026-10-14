import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // integration tests ใช้ฐานข้อมูลเดียวกัน — รันทีละไฟล์
    fileParallelism: false,
    testTimeout: 20_000,
    env: { NODE_ENV: "test" },
  },
});
