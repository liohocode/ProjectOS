import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Integration test chạy trên DB test riêng (meridian_test). Chạy tuần tự từng
// file vì các file dùng chung một DB; file nào ghi dữ liệu phải tự trả lại
// trạng thái ban đầu trong afterAll.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["**/*.integration.test.ts"],
    exclude: ["**/node_modules/**", ".next/**"],
    globalSetup: ["./test/integration-global-setup.ts"],
    setupFiles: ["./test/integration-env.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 120_000,
  },
});
