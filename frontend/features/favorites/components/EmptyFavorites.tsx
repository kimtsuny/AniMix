"use client";

import { motion } from "framer-motion";
import { Heart } from "lucide-react";

export function EmptyFavorites() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col items-center justify-center py-32 px-6 text-center"
    >
      {/* Glowing heart illustration */}
      <div className="relative mb-8">
        {/* Red glow behind */}
        <div
          className="absolute inset-0 rounded-full blur-3xl opacity-30"
          style={{
            background: "radial-gradient(circle, rgba(239,68,68,0.6) 0%, transparent 70%)",
            transform: "scale(2.5)",
          }}
        />
        <motion.div
          animate={{
            scale: [1, 1.06, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Heart
            className="relative h-24 w-24 text-red-500"
            fill="currentColor"
            strokeWidth={1}
          />
        </motion.div>
      </div>

      <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
        No favorites yet
      </h2>
      <p className="text-neutral-400 text-base md:text-lg max-w-sm leading-relaxed">
        Save your favorite anime and they will appear here.
      </p>
    </motion.div>
  );
}
