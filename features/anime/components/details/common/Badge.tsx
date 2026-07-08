import { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "outline" | "success" | "warning";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variants = {
    default: "bg-primary/20 text-primary border border-primary/30",
    outline: "bg-transparent text-muted-foreground border border-border",
    success: "bg-green-500/20 text-green-500 border border-green-500/30",
    warning: "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30",
  };

  return (
    <span className={cn("px-2 py-0.5 rounded text-xs font-medium backdrop-blur-sm", variants[variant], className)}>
      {children}
    </span>
  );
}
