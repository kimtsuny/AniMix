import { Recommendation } from "@/features/anime/types/recommendation";
import { SectionContainer } from "../common/SectionContainer";
import { SectionHeader } from "../common/SectionHeader";
import { CarouselNavigation } from "../common/CarouselNavigation";
import { RecommendationCard } from "./RecommendationCard";
import { Carousel, CarouselContent, CarouselItem } from "@/shared/components/ui/carousel";

interface RecommendationsProps {
  recommendations: Recommendation[];
}

export function Recommendations({ recommendations }: RecommendationsProps) {
  if (!recommendations || recommendations.length === 0) {
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
          title="You Might Also Like" 
          action={<CarouselNavigation />} 
        />
        
        <CarouselContent className="-ml-4">
          {recommendations.map((recommendation) => (
            <CarouselItem key={recommendation.id} className="pl-4 basis-auto">
              <RecommendationCard recommendation={recommendation} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </SectionContainer>
  );
}
