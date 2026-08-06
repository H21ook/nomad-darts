import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  cacheComponents: true,
  allowedDevOrigins: ["http://192.168.68.67:3000", "http://127.0.0.1:3000"],
};

export default withSerwist(nextConfig);
