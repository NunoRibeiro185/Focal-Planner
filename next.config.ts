import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@lemonsqueezy/lemonsqueezy.js"],
  async headers() {
    return [
      {
        // Allow the public inquiry form page to be embedded as an iframe
        source: "/inquiry/:slug*",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
