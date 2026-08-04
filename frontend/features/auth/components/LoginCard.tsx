"use client";

import { useCallback, useState } from "react";
import { type Variants, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import AuthLogo from "./AuthLogo";
import SocialLoginButtons from "./SocialLoginButtons";
import LoginForm from "./LoginForm";
import type { LoginFormData, SocialProvider } from "../types/auth";
import { login } from "../api/login";
import { socialLogin } from "../api/social-login";
import { useRouter } from "next/navigation";
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.5,
      staggerChildren: 0.06,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

/**
 * Right panel container: logo, heading, social buttons, OR divider,
 * form, sign-in button, and sign-up link.
 * Centered layout with max-width constraint.
 */
export default function LoginCard() {
  const [isLoading, setIsLoading] = useState(false);
const router = useRouter();

  const handleFormSubmit = useCallback(async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      router.replace('/');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const handleSocialLogin = useCallback(async (provider: SocialProvider) => {
    setIsLoading(true);
    try {
      await socialLogin(provider);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSignInClick = useCallback(() => {
    // Trigger the form submit via the LoginForm's internal form
    const form = document.querySelector<HTMLFormElement>(
      'form[class*="flex"]'
    );
    if (form) {
      form.requestSubmit();
    }
  }, []);

  return (
    <div className="flex items-center justify-center h-full w-full px-6 sm:px-10 lg:px-12 xl:px-16">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-[400px] flex flex-col items-center"
      >
        {/* Language selector (top-right on desktop) */}
        <motion.div
          variants={itemVariants}
          className="self-end mb-6 hidden lg:flex items-center gap-1.5 text-xs text-white/50 cursor-default"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
          </svg>
          <span className="font-medium">EN</span>
          <svg
            className="w-3 h-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </motion.div>

        {/* Logo */}
        <motion.div variants={itemVariants}>
          <AuthLogo />
        </motion.div>

        {/* Heading */}
        <motion.div variants={itemVariants} className="text-center mt-6 mb-8">
          <h2 className="text-2xl sm:text-[26px] font-bold text-white tracking-tight">
            Welcome Back!
          </h2>
          <p className="mt-2 text-sm text-white/40">
            Log in to continue your anime journey
          </p>
        </motion.div>

        {/* Social login buttons */}
        <motion.div variants={itemVariants} className="w-full">
          <SocialLoginButtons onSocialLogin={handleSocialLogin} />
        </motion.div>

        {/* OR divider */}
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-4 w-full my-6"
        >
          <div className="flex-1 h-px bg-white/[0.08]" />
          <span className="text-xs font-medium text-white/30 uppercase tracking-widest">
            OR
          </span>
          <div className="flex-1 h-px bg-white/[0.08]" />
        </motion.div>

        {/* Login form */}
        <motion.div variants={itemVariants} className="w-full">
          <LoginForm onSubmit={handleFormSubmit} isLoading={isLoading} />
        </motion.div>

        {/* Sign In button */}
        <motion.div variants={itemVariants} className="w-full mt-6">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSignInClick}
            disabled={isLoading}
            type="button"
            className="relative w-full h-[50px] rounded-xl font-semibold text-[15px] text-white overflow-hidden transition-all duration-300 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d18]"
            style={{
              background:
                "linear-gradient(135deg, #a855f7 0%, #d946ef 50%, #ec4899 100%)",
              boxShadow: "0 4px 24px rgba(168,85,247,0.35)",
            }}
            aria-label="Sign In"
          >
            {/* Hover glow overlay */}
            <div
              className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
              style={{
                background:
                  "linear-gradient(135deg, #b87afc 0%, #e055f5 50%, #f472b6 100%)",
              }}
            />

            <span className="relative z-10 flex items-center justify-center gap-2">
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    repeat: Infinity,
                    duration: 1,
                    ease: "linear",
                  }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </span>
          </motion.button>
        </motion.div>

        {/* Sign up link */}
        <motion.p
          variants={itemVariants}
          className="mt-6 text-sm text-white/40 text-center"
        >
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:rounded-sm"
          >
            Sign up
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
