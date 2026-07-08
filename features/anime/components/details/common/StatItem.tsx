import { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface StatItemProps {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  className?: string;
}

export function StatItem({ icon, label, value, className }: StatItemProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs text-muted-foreground flex items-center gap-1 uppercase tracking-wider font-semibold">
        {icon}
        {label}
      </span>
      <span className="text-sm md:text-base font-medium">{value || "—"}</span>
    </div>
  );
}
