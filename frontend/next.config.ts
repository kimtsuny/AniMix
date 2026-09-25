import type { NextConfig } from "next";

const backendUrl = (
  process.env.BACKEND_URL || "https://animix-6nh7.onrender.com"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.114"],

  experimental: {
    appNewScrollHandler: true,
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
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
    ],
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;