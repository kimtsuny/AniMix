import { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface InfoChipProps {
  icon?: ReactNode;
  label: ReactNode;
  className?: string;
}

export function InfoChip({ icon, label, className }: InfoChipProps) {
  return (
    <div className={cn("flex items-center gap-1.5 text-sm text-muted-foreground", className)}>
      {icon && <span className="text-foreground/70">{icon}</span>}
      <span className="font-medium">{label}</span>
    </div>
  );
}
