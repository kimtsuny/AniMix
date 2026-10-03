"use client";

import React from "react";
import clsx from "clsx";

export interface PlayerTooltipProps {
  /** Accessible tooltip label text */
  label: string;
  /** Interactive button or control to wrap */
  children: React.ReactNode;
  /** Horizontal alignment relative to the control. Defaults to "center". */
  align?: "center" | "left" | "right";
  /** Disables the tooltip (e.g. when menu is open or control is disabled) */
  disabled?: boolean;
  /** Additional styling classes for the tooltip bubble */
  className?: string;
  /** Additional styling classes for the wrapper element */
  wrapperClassName?: string;
}

export function PlayerTooltip({
  label,
  children,
  align = "center",
  disabled = false,
  className,
  wrapperClassName,
}: PlayerTooltipProps) {
  return (
    <div
      className={clsx(
        "relative inline-flex items-center justify-center flex-shrink-0 group/tooltip",
        wrapperClassName
      )}
    >
      {children}
      {!disabled && Boolean(label) && (
        <div
          role="tooltip"
          aria-hidden="true"
          className={clsx(
            "absolute bottom-full mb-2 pointer-events-none select-none z-30",
            "[@media(hover:none)]:hidden",
            align === "center" && "left-1/2 -translate-x-1/2",
            align === "left" && "left-0",
            align === "right" && "right-0"
          )}
        >
          <div
            className={clsx(
              "px-2.5 py-1 rounded-md bg-[#131215]/95 backdrop-blur-md border border-white/15",
              "text-white text-[11px] md:text-xs font-medium tracking-tight whitespace-nowrap shadow-md shadow-black/60",
              "opacity-0",
              "group-hover/tooltip:opacity-100",
              "transition-opacity duration-150 ease-out",
              className
            )}
          >
            {label}
          </div>
        </div>
      )}
    </div>
  );
}
