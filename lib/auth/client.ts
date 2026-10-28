"use client";

import { createAuthClient } from "better-auth/react";

// Client Better Auth cho component client (nút đăng nhập/đăng xuất). Cùng origin → không cần baseURL.
export const authClient = createAuthClient();
