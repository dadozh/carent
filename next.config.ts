import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  // Comma-separated IPs/hostnames that need LAN dev access (e.g. tablets, phones).
  // Set in .env.local: ALLOWED_DEV_ORIGINS=192.168.1.54,192.168.1.100
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS
    ? process.env.ALLOWED_DEV_ORIGINS.split(",").map((s) => s.trim())
    : [],
};

export default nextConfig;
