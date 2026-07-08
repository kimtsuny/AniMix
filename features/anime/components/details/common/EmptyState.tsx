import { cn } from "@/shared/lib/utils";
import { AlertCircle } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  message?: string;
  className?: string;
}

export function EmptyState({ 
  title = "No Data", 
  message = "No items to display here.", 
  className 
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center rounded-xl border border-border/50 bg-muted/20", className)}>
      <AlertCircle className="h-8 w-8 text-muted-foreground/50 mb-3" />
      <h3 className="font-semibold text-lg text-foreground/80">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
    </div>
  );
}
