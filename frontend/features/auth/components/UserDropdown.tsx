"use client";

import type { MenuItem } from "../types/auth";

interface UserDropdownProps {
  items: MenuItem[];
  onItemClick: () => void;
}

export default function UserDropdown({ items, onItemClick }: UserDropdownProps) {
  // Find the index where we need a separator (before Settings in unauthenticated, before Logout in authenticated)
  const separatorIndex = items.findIndex(
    (item) => item.variant === "destructive" || item.label === "Settings"
  );

  return (
    <div
      role="menu"
      className="absolute right-0 top-full mt-2 w-52 origin-top-right rounded-xl border border-white/10 bg-zinc-900/95 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-xl"
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        const isDestructive = item.variant === "destructive";
        const showSeparator = index === separatorIndex && index > 0;

        return (
          <div key={item.label}>
            {showSeparator && (
              <div className="my-1.5 border-t border-white/[0.06]" />
            )}
            <button
              role="menuitem"
              onClick={() => {
                item.onClick?.();
                onItemClick();
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150 ${isDestructive
                  ? "text-red-400 hover:bg-red-500/10"
                  : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
