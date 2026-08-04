"use client";

import { type Variants, motion } from "framer-motion";
import Image from "next/image";
import FeatureCards from "./FeatureCards";

const textVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.2 + i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

/**
 * Full-height left panel with anime artwork, gradient overlays,
 * branding text, and feature cards at the bottom.
 */
export default function AuthHero() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-l-[20px]">
      {/* Hero artwork */}
      <motion.div
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="absolute inset-0"
      >
        <Image
          src="/images/hero/aot.jpg"
          alt="Anime character in a mystical moonlit scene"
          fill
          priority
          sizes="55vw"
          className="object-cover"
          style={{ objectPosition: "center 20%" }}
        />
      </motion.div>

      {/* Gradient overlays for text readability */}
      {/* Bottom fade — strong cinematic dissolve */}
      <div
        className="absolute inset-x-0 bottom-0 h-[70%] pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, #06060e 0%, rgba(6,6,14,0.95) 15%, rgba(6,6,14,0.7) 35%, rgba(6,6,14,0.3) 55%, transparent 100%)",
        }}
      />

      {/* Left fade for text anchor */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, rgba(6,6,14,0.5) 0%, rgba(6,6,14,0.2) 30%, transparent 60%)",
        }}
      />

      {/* Top fade */}
      <div
        className="absolute inset-x-0 top-0 h-32 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(6,6,14,0.6) 0%, transparent 100%)",
        }}
      />

      {/* Content overlay — bottom-left aligned */}
      <div className="absolute inset-0 flex flex-col justify-end p-8 lg:p-10 xl:p-12">
        {/* Branding text */}
        <div className="space-y-2 mb-6">
          <motion.p
            custom={0}
            variants={textVariants}
            initial="hidden"
            animate="visible"
            className="text-lg lg:text-xl text-white/90 font-normal"
          >
            Welcome to
          </motion.p>

          <motion.h1
            custom={1}
            variants={textVariants}
            initial="hidden"
            animate="visible"
            className="text-4xl lg:text-5xl xl:text-[3.25rem] font-extrabold tracking-tight"
          >
            <span className="text-white">Anime</span>
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #c084fc, #ec4899)",
              }}
            >
              Hub
            </span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={textVariants}
            initial="hidden"
            animate="visible"
            className="text-sm lg:text-[15px] text-white/50 leading-relaxed max-w-[320px]"
          >
            Your ultimate anime catalog.
          </motion.p>
        </div>

        {/* Feature cards */}
        <div className="hidden lg:block">
          <FeatureCards />
        </div>
      </div>
    </div>
  );
}
