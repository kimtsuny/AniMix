"use client";

import { motion } from "framer-motion";
import { useSearchStore } from "../store/search.store";

export function SearchBackdropInline() {
  const { closeSearch } = useSearchStore();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      onClick={closeSearch}
      className="fixed inset-0 z-40 bg-black/50"
      aria-hidden="true"
    />
  );
}
