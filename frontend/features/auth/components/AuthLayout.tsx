"use client";

import { motion } from "framer-motion";
import AuthBackground from "./AuthBackground";

interface AuthLayoutProps {
  hero: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Split-screen auth layout (55/45).
 * Rounded outer container with subtle border.
 * Hides hero on mobile, adjusts proportions on tablet.
 */
export default function AuthLayout({ hero, children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-dvh flex items-center justify-center p-3 sm:p-4 lg:p-5">
      {/* Ambient background */}
      <AuthBackground />

      {/* Outer rounded container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[1200px] h-[calc(100dvh-24px)] sm:h-[calc(100dvh-32px)] lg:h-[calc(100dvh-40px)] rounded-[20px] overflow-hidden flex border border-white/[0.06]"
        style={{
          background: "rgba(13,13,24,0.8)",
          boxShadow:
            "0 0 80px rgba(139,92,246,0.06), 0 0 0 1px rgba(255,255,255,0.03)",
        }}
      >
        {/* Left panel — Hero (hidden on mobile/small tablet) */}
        <div className="hidden md:block relative w-[45%] lg:w-[55%]">
          {hero}
        </div>

        {/* Right panel — Login */}
        <div className="relative flex-1 flex flex-col min-w-0">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
