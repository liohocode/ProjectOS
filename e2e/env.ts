// Giá trị giả cố định cho e2e (không phải secret thật) — dùng chung giữa playwright.config.ts
// (env của server) và e2e/auth.setup.ts (ký cookie session bằng cùng secret).
export const E2E_PORT = 3100;
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
export const E2E_AUTH_SECRET = "+Iq92LhXRCY98rYw7ATsJhqW7xgabLYH7UyYTJBr+QI="; // ngẫu nhiên cố định, chỉ cho e2e
export const E2E_GOOGLE_CLIENT_ID = "e2e-google-client-id";
/** Phiên đăng nhập của Trung Hiếu (tech lead, thuộc cả 3 dự án mẫu) — mọi spec dùng mặc định. */
export const E2E_STORAGE_STATE = "e2e/.auth/hieu.json";
