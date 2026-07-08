import { Episode } from "@/features/anime/types/episode";
import { EpisodeCard } from "./EpisodeCard";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/shared/components/ui/carousel";
import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface EpisodesProps {
  episodes: Episode[];
  fallbackImage?: string | null;
}

export function Episodes({ episodes, fallbackImage }: EpisodesProps) {
  const hasEpisodes = episodes && episodes.length > 0;

  if (!hasEpisodes && !fallbackImage) {
    return null;
  }

  return (
    <Carousel
      opts={{
        align: "start",
        dragFree: true,
      }}
      className="w-full group/episodes relative"
    >
      <CarouselContent className="-ml-4">
        {hasEpisodes ? (
          episodes.map((episode, index) => (
            <CarouselItem key={index} className="pl-4 basis-auto">
              <EpisodeCard episode={episode} />
            </CarouselItem>
          ))
        ) : (
          <CarouselItem className="pl-4 basis-auto">
            <Link href="#" className="group block w-[280px] md:w-[320px] shrink-0 cursor-not-allowed opacity-80">
              <div className="relative aspect-video rounded-lg overflow-hidden mb-3 bg-muted ring-1 ring-border/50">
                <Image
                  src={fallbackImage!}
                  alt="Fallback Image"
                  fill
                  className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white">
                    <Play className="h-5 w-5 ml-1 fill-current" />
                  </div>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-primary mb-1 uppercase tracking-wider">Episode 1</span>
                <h3 className="font-medium text-sm text-foreground/90">
                  Watch Full Series
                </h3>
              </div>
            </Link>
          </CarouselItem>
        )}
      </CarouselContent>
      
      <CarouselPrevious 
        className={cn(
          "absolute left-4 top-1/2 z-20 -translate-y-1/2 h-10 w-10 rounded-full",
          "border border-white/10 bg-black/50 text-white backdrop-blur-md transition-all duration-300",
          "hover:scale-105 hover:bg-black/65",
          "opacity-0 pointer-events-none group-hover/episodes:opacity-100 group-hover/episodes:pointer-events-auto md:flex hidden items-center justify-center",
          "disabled:opacity-0 disabled:pointer-events-none"
        )}
      />
      <CarouselNext 
        className={cn(
          "absolute right-4 top-1/2 z-20 -translate-y-1/2 h-10 w-10 rounded-full",
          "border border-white/10 bg-black/50 text-white backdrop-blur-md transition-all duration-300",
          "hover:scale-105 hover:bg-black/65",
          "opacity-0 pointer-events-none group-hover/episodes:opacity-100 group-hover/episodes:pointer-events-auto md:flex hidden items-center justify-center",
          "disabled:opacity-0 disabled:pointer-events-none"
        )}
      />
    </Carousel>
  );
}
