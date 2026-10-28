import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build ra .next/standalone (server.js + node_modules tối thiểu) để đóng container cho Cloud Run (F19.2, ADR-016).
  output: "standalone",
};

export default nextConfig;
