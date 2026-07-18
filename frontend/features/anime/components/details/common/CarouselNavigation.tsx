import { CarouselNext, CarouselPrevious } from "@/shared/components/ui/carousel";
import { cn } from "@/shared/lib/utils";

interface CarouselNavigationProps {
  className?: string;
}

export function CarouselNavigation({ className }: CarouselNavigationProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <CarouselPrevious className="static translate-y-0 h-8 w-8 bg-transparent hover:bg-muted" />
      <CarouselNext className="static translate-y-0 h-8 w-8 bg-transparent hover:bg-muted" />
    </div>
  );
}
