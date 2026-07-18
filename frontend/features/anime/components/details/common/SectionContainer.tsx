import { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface SectionContainerProps {
  children: ReactNode;
  className?: string;
}

export function SectionContainer({ children, className }: SectionContainerProps) {
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      {children}
    </section>
  );
}
