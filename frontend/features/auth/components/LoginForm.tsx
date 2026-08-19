"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import type { LoginFormData } from "../types/auth";
import ForgotPassword from "./ForgotPassword";

interface LoginFormProps {
  onSubmit?: (data: LoginFormData) => void;
  isLoading?: boolean;
  mode: "login" | "register";
}

const inputBaseStyles =
  "w-full h-12 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white placeholder:text-white/30 transition-all duration-200 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/[0.15] focus:bg-white/[0.06]";

export default function LoginForm({
  onSubmit,
  isLoading,
  mode,
}: LoginFormProps) {
  const [formData, setFormData] = useState<LoginFormData>({
    username: "",
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;

      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    },
    []
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      onSubmit?.(formData);
    },
    [formData, onSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* Username - يظهر فقط في Register */}
      {mode === "register" && (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="auth-username"
            className="text-[13px] font-medium text-white/80"
          >
            Username
          </label>

          <motion.input
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            id="auth-username"
            name="username"
            type="text"
            autoComplete="username"
            required
            placeholder="Enter your username"
            value={formData.username ?? ""}
            onChange={handleChange}
            disabled={isLoading}
            className={inputBaseStyles}
            aria-label="Username"
          />
        </div>
      )}

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="auth-email"
          className="text-[13px] font-medium text-white/80"
        >
          Email
        </label>

        <motion.input
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          id="auth-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleChange}
          disabled={isLoading}
          className={inputBaseStyles}
          aria-label="Email address"
        />
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="auth-password"
          className="text-[13px] font-medium text-white/80"
        >
          Password
        </label>

        <div className="relative">
          <motion.input
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            id="auth-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={
              mode === "register"
                ? "new-password"
                : "current-password"
            }
            required
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            disabled={isLoading}
            className={`${inputBaseStyles} pr-12`}
            aria-label="Password"
          />

          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors duration-200"
            aria-label={
              showPassword
                ? "Hide password"
                : "Show password"
            }
          >
            {showPassword ? (
              <Eye className="w-[18px] h-[18px]" />
            ) : (
              <EyeOff className="w-[18px] h-[18px]" />
            )}
          </button>
        </div>

        {/* يظهر فقط في Login */}
        {mode === "login" && <ForgotPassword />}
      </div>
    </form>
  );
}