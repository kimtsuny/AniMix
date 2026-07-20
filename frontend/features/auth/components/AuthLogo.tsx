"use client";

import { motion } from "framer-motion";

/**
 * Circular "A" logo with purple/pink gradient ring and glow effect.
 * Matches the reference image logo design exactly.
 */
export default function AuthLogo() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex items-center justify-center"
    >
      <div className="relative flex items-center justify-center">
        {/* Outer glow */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 180deg, #a855f7, #ec4899, #a855f7)",
            filter: "blur(12px)",
            opacity: 0.4,
            transform: "scale(1.15)",
          }}
        />

        {/* Gradient ring */}
        <div
          className="relative w-[72px] h-[72px] rounded-full p-[2px]"
          style={{
            background:
              "conic-gradient(from 180deg, #a855f7, #ec4899, #d946ef, #a855f7)",
          }}
        >
          {/* Inner dark fill */}
          <div className="w-full h-full rounded-full bg-[#0d0d18] flex items-center justify-center">
            <span
              className="text-2xl font-bold bg-clip-text text-transparent select-none"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #c084fc, #ec4899)",
              }}
            >
              A
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
