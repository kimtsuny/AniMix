"use client";

import Link from "next/link";

/**
 * "Forgot password?" link with pink accent color.
 */
export default function ForgotPassword() {
  return (
    <div className="flex justify-end">
      <Link
        href="/forgot-password"
        className="text-xs font-medium text-pink-400 hover:text-pink-300 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:rounded-sm"
      >
        Forgot password?
      </Link>
    </div>
  );
}
