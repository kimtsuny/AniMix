import Image from "next/image";
import Link from "next/link";
import { Episode } from "@/features/anime/types/episode";
import { Play } from "lucide-react";

interface EpisodeCardProps {
  episode: Episode;
}

export function EpisodeCard({ episode }: EpisodeCardProps) {
  // Try to parse episode number from title (e.g. "Episode 1 - The Beginning")
  const titleParts = episode.title?.split('-') || [];
  const epPrefix = titleParts.length > 1 ? titleParts[0].trim() : "Episode";
  const titleBody = titleParts.length > 1 ? titleParts.slice(1).join('-').trim() : episode.title;

  return (
    <Link href={episode.url || "#"} target="_blank" rel="noopener noreferrer" className="group block w-[280px] md:w-[320px] shrink-0">
      <div className="relative aspect-video rounded-lg overflow-hidden mb-3 bg-muted ring-1 ring-border/50 group-hover:ring-primary/50 transition-all">
        {episode.thumbnail ? (
          <Image
            src={episode.thumbnail}
            alt={episode.title || "Episode Thumbnail"}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/80 text-muted-foreground">
            No Preview
          </div>
        )}
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 border border-white/30 text-white">
            <Play className="h-5 w-5 ml-1 fill-current" />
          </div>
        </div>
        
        
      </div>
      
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-primary mb-1 uppercase tracking-wider">{epPrefix}</span>
        <h3 className="font-medium text-sm line-clamp-2 text-foreground/90 group-hover:text-primary transition-colors">
          {titleBody || "Unknown Title"}
        </h3>
      </div>
    </Link>
  );
}
