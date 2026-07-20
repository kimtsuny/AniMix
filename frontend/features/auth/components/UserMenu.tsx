"use client";

import { useMemo } from "react";
import {
  ChevronDown,
  Heart,
  LogIn,
  LogOut,
  Settings,
  User,
  UserPlus,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import { useUserMenu } from "../hooks/useUserMenu";
import UserAvatar from "./UserAvatar";
import UserDropdown from "./UserDropdown";
import type { MenuItem } from "../types/auth";

export default function UserMenu() {
  const { user, logout } = useAuth();
  const { isOpen, toggle, close, menuRef } = useUserMenu();

  const menuItems: MenuItem[] = useMemo(() => {
    if (user) {
      return [
        { label: "Profile", icon: User },
        { label: "Favorites", icon: Heart },
        { label: "Settings", icon: Settings },
        {
          label: "Logout",
          icon: LogOut,
          onClick: logout,
          variant: "destructive" as const,
        },
      ];
    }

    return [
      { label: "Login", icon: LogIn },
      { label: "Create Account", icon: UserPlus },
      { label: "Settings", icon: Settings },
    ];
  }, [user, logout]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={toggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-1.5 rounded-full p-0.5 transition-colors duration-200 hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
      >
        <UserAvatar user={user} />
        <ChevronDown
          className={`h-4 w-4 text-zinc-400 transition-transform duration-300 ${isOpen ? "rotate-180" : "rotate-0"
            }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <UserDropdown items={menuItems} onItemClick={close} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
