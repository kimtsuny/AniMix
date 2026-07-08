import { Staff as StaffType } from "@/features/anime/types/staff";
import { SectionContainer } from "../common/SectionContainer";
import { SectionHeader } from "../common/SectionHeader";
import { CarouselNavigation } from "../common/CarouselNavigation";
import { StaffCard } from "./StaffCard";
import { Carousel, CarouselContent, CarouselItem } from "@/shared/components/ui/carousel";

interface StaffProps {
  staff: StaffType[];
}

export function Staff({ staff }: StaffProps) {
  if (!staff || staff.length === 0) {
    return null;
  }

  return (
    <SectionContainer>
      <Carousel
        opts={{
          align: "start",
          dragFree: true,
        }}
        className="w-full"
      >
        <SectionHeader 
          title="Staff" 
          action={<CarouselNavigation />} 
        />
        
        <CarouselContent className="-ml-4">
          {staff.map((person) => (
            <CarouselItem key={person.id} className="pl-4 basis-auto">
              <StaffCard staff={person} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </SectionContainer>
  );
}
