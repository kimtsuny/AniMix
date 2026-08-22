import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.114"],

  experimental: {
    appNewScrollHandler: true,
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://animix-6nh7.onrender.com/:path*",
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "s4.anilist.co",
      },
      {
        protocol: "https",
        hostname: "img1.ak.crunchyroll.com",
      },
    ],
  },
};

export default nextConfig;