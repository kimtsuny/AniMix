import { Relation } from "@/features/anime/types/relation";
import { SectionContainer } from "../common/SectionContainer";
import { SectionHeader } from "../common/SectionHeader";
import { CarouselNavigation } from "../common/CarouselNavigation";
import { EmptyState } from "../common/EmptyState";
import { RelatedSeriesCard } from "./RelatedSeriesCard";
import { Carousel, CarouselContent, CarouselItem } from "@/shared/components/ui/carousel";

interface RelatedSeriesProps {
  relations: Relation[];
}

export function RelatedSeries({ relations }: RelatedSeriesProps) {
  if (!relations || relations.length === 0) {
    return null; // Hidden when no data as per requirements
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
          title="Related Series" 
          action={<CarouselNavigation />} 
        />
        
        <CarouselContent className="-ml-4">
          {relations.map((relation) => (
            <CarouselItem key={relation.id} className="pl-4 basis-auto">
              <RelatedSeriesCard relation={relation} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </SectionContainer>
  );
}
