"use client";

import { useCallback, useState } from "react";
import type { User } from "../types/auth";
import { MOCK_USER } from "../lib/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(MOCK_USER);
  const [isLoading] = useState(false);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return { user, isLoading, logout };
}
