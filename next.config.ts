import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  cacheComponents: true,
  webpack: (config) => {
    return config;
  },
  allowedDevOrigins: ["http://192.168.68.67:3000", "http://127.0.0.1:3000"],
};

export default withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
})(nextConfig);
