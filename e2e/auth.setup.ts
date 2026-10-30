import { test as setup } from "@playwright/test";
import { E2E_NAM_STORAGE_STATE, E2E_STORAGE_STATE } from "./env";
import { signInAs } from "./session";

setup("đăng nhập Trung Hiếu", async ({ context }) => {
  await signInAs(context, "hieu");
  await context.storageState({ path: E2E_STORAGE_STATE });
});

// F15.6 — người không phải tech lead.
setup("đăng nhập Nguyễn Nam", async ({ context }) => {
  await signInAs(context, "nam");
  await context.storageState({ path: E2E_NAM_STORAGE_STATE });
});
