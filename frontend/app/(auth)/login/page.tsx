"use client";

import { AuthLayout, AuthHero, LoginCard } from "@/features/auth/components";

/**
 * Login page — premium split-screen auth experience.
 * Left panel: cinematic anime hero artwork with branding.
 * Right panel: login form with social auth options.
 */
export default function LoginPage() {
  return (
    <AuthLayout hero={<AuthHero />}>
      <LoginCard />
    </AuthLayout>
  );
}
