import Image from "next/image";
import { Character } from "@/features/anime/types/character";

interface CharacterCardProps {
  character: Character;
}

export function CharacterCard({ character }: CharacterCardProps) {
  return (
    <div className="group block w-[140px] md:w-[160px] shrink-0 text-center">
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-3 bg-muted ring-1 ring-border/50">
        {character.image ? (
          <Image
            src={character.image}
            alt={character.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No Image</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      
      <h3 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors px-1">
        {character.name}
      </h3>
      {character.role && (
        <span className="text-xs text-muted-foreground mt-0.5 block">{character.role}</span>
      )}
    </div>
  );
}
