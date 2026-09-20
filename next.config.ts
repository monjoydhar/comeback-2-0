import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  serverExternalPackages: ["pdfkit"],

 
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/pdfkit/**/*"],
  },
};

export default nextConfig;