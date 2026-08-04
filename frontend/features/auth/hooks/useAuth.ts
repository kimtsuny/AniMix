"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "../types/auth";
import { me } from "../api/me";
import { logout as logoutApi } from "../api/logout";
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await me();
        setUser(currentUser);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  const logout = useCallback(async () => {
  await logoutApi();

  setUser(null);
}, []);

  return {
    user,
    isLoading,
    logout,
  };
}