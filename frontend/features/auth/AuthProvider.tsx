"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { User } from "./types/auth";
import { me } from "./api/me";
import { logout as logoutApi } from "./api/logout";
import { isUnauthorizedError } from "@/shared/api/http-client";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const latestRequestIdRef = useRef(0);

  const refreshUser = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current;
    try {
      const currentUser = await me({ force: true });
      if (requestId !== latestRequestIdRef.current) return;
      setUser(currentUser);
    } catch (error) {
      if (requestId !== latestRequestIdRef.current) return;
      if (isUnauthorizedError(error)) {
        setUser(null);
      } else {
        console.error("Failed to authenticate session:", error);
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      const requestId = ++latestRequestIdRef.current;
      try {
        const currentUser = await me();
        if (!isMounted || requestId !== latestRequestIdRef.current) return;
        setUser(currentUser);
      } catch (error) {
        if (!isMounted || requestId !== latestRequestIdRef.current) return;
        if (isUnauthorizedError(error)) {
          setUser(null);
        } else {
          console.error("Failed to authenticate session:", error);
          setUser(null);
        }
      } finally {
        if (isMounted && requestId === latestRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const logout = useCallback(async () => {
    latestRequestIdRef.current++;
    try {
      await logoutApi();
    } catch (error) {
      console.error("Failed to logout:", error);
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuthContext must be used inside AuthProvider"
    );
  }

  return context;
}