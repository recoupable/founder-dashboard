import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    esmExternals: true,
  },
  compiler: {
    styledComponents: false,
  },
};

export default nextConfig;
