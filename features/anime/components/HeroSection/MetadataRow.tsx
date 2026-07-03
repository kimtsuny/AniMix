import { memo } from "react";
import { Star } from "lucide-react";

interface MetadataRowProps {
    rating: string | number;
    year: string | number;
    type: string;
    episodes: number;
    duration: string;
}

function MetadataRow({
    rating,
    year,
    type,
    episodes,
    duration,
}: MetadataRowProps) {
    const formattedRating = typeof rating === 'number' ? rating.toFixed(1) : rating;
    
    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs md:text-sm text-zinc-300 font-medium">
            <span className="flex items-center gap-1 text-amber-500 font-bold drop-shadow-md">
                <Star className="h-3.5 w-3.5 fill-amber-500" />
                {formattedRating}
            </span>
            <span className="w-1 h-1 rounded-full bg-zinc-500/80" />
            <span className="drop-shadow-md">{year}</span>
            <span className="w-1 h-1 rounded-full bg-zinc-500/80" />
            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-zinc-800/80 text-zinc-200 border border-zinc-700/80 backdrop-blur-sm">
                {type}
            </span>
            <span className="w-1 h-1 rounded-full bg-zinc-500/80" />
            <span className="drop-shadow-md">{episodes} Episodes</span>
            <span className="w-1 h-1 rounded-full bg-zinc-500/80" />
            <span className="drop-shadow-md">{duration}</span>
        </div>
    );
}

export default memo(MetadataRow);
