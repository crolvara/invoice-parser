import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray package-lock.json exists in a parent directory; pin the workspace
  // root to this project so Next doesn't infer the wrong one.
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
