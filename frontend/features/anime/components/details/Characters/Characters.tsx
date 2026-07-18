import { Character } from "@/features/anime/types/character";
import { SectionContainer } from "../common/SectionContainer";
import { SectionHeader } from "../common/SectionHeader";
import { CarouselNavigation } from "../common/CarouselNavigation";
import { CharacterCard } from "./CharacterCard";
import { Carousel, CarouselContent, CarouselItem } from "@/shared/components/ui/carousel";

interface CharactersProps {
  characters: Character[];
}

export function Characters({ characters }: CharactersProps) {
  if (!characters || characters.length === 0) {
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
          title="Characters" 
          action={<CarouselNavigation />} 
        />
        
        <CarouselContent className="-ml-4">
          {characters.map((character) => (
            <CarouselItem key={character.id} className="pl-4 basis-auto">
              <CharacterCard character={character} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </SectionContainer>
  );
}
