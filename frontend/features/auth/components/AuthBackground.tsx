"use client";

import { motion } from "framer-motion";

/**
 * Radial gradient background with ambient purple/pink glow.
 * Provides the dark atmospheric base layer for the entire auth page.
 */
export default function AuthBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden" aria-hidden="true">
      {/* Base dark background */}
      <div className="absolute inset-0 bg-[#06060e]" />

      {/* Primary purple radial glow — top-center */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute -top-[30%] left-1/2 -translate-x-1/2 w-[120%] h-[80%] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0.04) 40%, transparent 70%)",
        }}
      />

      {/* Secondary pink glow — bottom-right */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, delay: 0.3, ease: "easeOut" }}
        className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(236,72,153,0.08) 0%, rgba(236,72,153,0.02) 50%, transparent 70%)",
        }}
      />

      {/* Subtle noise texture overlay for depth */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
