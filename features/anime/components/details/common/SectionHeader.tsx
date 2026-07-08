import { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface SectionHeaderProps {
  title: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between mb-3", className)}>
      <h2 className="text-xl md:text-2xl font-bold tracking-tight">{title}</h2>
      {action && <div>{action}</div>}
    </div>
  );
}
