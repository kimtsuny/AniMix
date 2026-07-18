import { Relation } from "@/features/anime/types/relation";
import { SectionContainer } from "../common/SectionContainer";
import { SectionHeader } from "../common/SectionHeader";
import { CarouselNavigation } from "../common/CarouselNavigation";
import { RelatedSeriesCard } from "../RelatedSeries/RelatedSeriesCard";
import { Carousel, CarouselContent, CarouselItem } from "@/shared/components/ui/carousel";

interface RelatedContentProps {
  relations: Relation[];
}

export function RelatedContent({ relations }: RelatedContentProps) {
  if (!relations || relations.length === 0) {
    return null;
  }

  return (
    <SectionContainer>
      <Carousel
        opts={{ align: "start", dragFree: true }}
        className="w-full"
      >
        <SectionHeader 
          title="Related Content" 
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
