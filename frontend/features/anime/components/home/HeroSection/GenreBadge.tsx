import { memo } from "react";

interface GenreBadgeProps {
    genre: string;
}

function GenreBadge({ genre }: GenreBadgeProps) {
    return (
        <span
            className="px-2.5 py-0.5 rounded-full text-xs font-normal bg-zinc-900/40 backdrop-blur-md border border-white/10 text-zinc-300 select-none hover:bg-zinc-800/60 transition-colors"
        >
            {genre}
        </span>
    );
}

export default memo(GenreBadge);
