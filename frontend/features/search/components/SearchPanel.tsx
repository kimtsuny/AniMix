"use client";

import { motion } from "framer-motion";

interface SearchPanelProps {
  children: React.ReactNode;
}

export function SearchPanel({ children }: SearchPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30,
      }}
      className="w-full max-w-[640px] relative flex flex-col"
    >
      {children}
    </motion.div>
  );
}
