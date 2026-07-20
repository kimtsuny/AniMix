"use client";

import { type Variants, motion } from "framer-motion";

interface FeatureCard {
  icon: string;
  iconColor: string;
  glowColor: string;
  title: string;
  subtitle: string;
}

const features: FeatureCard[] = [
  {
    icon: "⭐",
    iconColor: "from-yellow-500/30 to-amber-500/30",
    glowColor: "rgba(234,179,8,0.3)",
    title: "Discover",
    subtitle: "Trending anime",
  },
  {
    icon: "❤️",
    iconColor: "from-pink-500/30 to-rose-500/30",
    glowColor: "rgba(236,72,153,0.3)",
    title: "Track",
    subtitle: "Your favorites",
  },
  {
    icon: "⚡",
    iconColor: "from-blue-500/30 to-violet-500/30",
    glowColor: "rgba(99,102,241,0.3)",
    title: "Stay Updated",
    subtitle: "New releases",
  },
];

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.8,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

/**
 * Three horizontal glass feature cards displayed at the bottom of the hero panel.
 * Each card has a colored icon badge, title, and subtitle with glassmorphism styling.
 */
export default function FeatureCards() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex items-center gap-3"
    >
      {features.map((feature) => (
        <motion.div
          key={feature.title}
          variants={cardVariants}
          whileHover={{ y: -2, borderColor: "rgba(255,255,255,0.15)" }}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/[0.08] cursor-default transition-colors duration-300"
          style={{
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {/* Icon badge with colored glow */}
          <div className="relative flex-shrink-0">
            <div
              className="absolute inset-0 rounded-full blur-md"
              style={{ background: feature.glowColor, opacity: 0.5 }}
            />
            <div
              className={`relative w-8 h-8 rounded-full bg-gradient-to-br ${feature.iconColor} flex items-center justify-center text-sm`}
            >
              {feature.icon}
            </div>
          </div>

          {/* Text */}
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-white leading-tight">
              {feature.title}
            </span>
            <span className="text-[11px] text-white/50 leading-tight">
              {feature.subtitle}
            </span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
