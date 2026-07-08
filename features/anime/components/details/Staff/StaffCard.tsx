import Image from "next/image";
import { Staff as StaffType } from "@/features/anime/types/staff";

interface StaffCardProps {
  staff: StaffType;
}

export function StaffCard({ staff }: StaffCardProps) {
  const primaryOccupation = staff.primaryOccupations?.[0] || "Staff";

  return (
    <div className="group block w-[140px] md:w-[160px] shrink-0 text-center">
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-3 bg-muted ring-1 ring-border/50">
        {staff.image ? (
          <Image
            src={staff.image}
            alt={staff.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No Image</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      
      <h3 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors px-1">
        {staff.name}
      </h3>
      <span className="text-xs text-muted-foreground mt-0.5 block px-1 line-clamp-1">
        {primaryOccupation}
      </span>
    </div>
  );
}
