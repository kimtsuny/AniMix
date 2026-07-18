import { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface LoadingContainerProps {
  className?: string;
  children: ReactNode;
}

export function LoadingContainer({ className, children }: LoadingContainerProps) {
  return (
    <div className={cn("animate-pulse flex flex-col gap-4", className)}>
      {children}
    </div>
  );
}
