"use client";

import { motion } from "framer-motion";

interface SearchBackdropProps {
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

export function SearchBackdrop({ onClick, children }: SearchBackdropProps) {
  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-black/60 backdrop-blur-sm"
    >
      {children}
    </motion.div>
  );
}
