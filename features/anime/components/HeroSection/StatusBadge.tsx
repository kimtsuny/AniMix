import { memo } from "react";
import { Flame, Sparkles, Star } from "lucide-react";

interface StatusBadgeProps {
    status: "Trending" | "Popular" | "New Season";
}

const badgeStyles = {
    Trending: {
        icon: <Flame className="h-5 w-5 fill-amber-500 text-amber-500" />,
        className: "border-amber-500/20 bg-amber-500/10 text-amber-100",
    },
    Popular: {
        icon: <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />,
        className: "border-yellow-500/20 bg-yellow-500/10 text-yellow-100",
    },
    "New Season": {
        icon: <Sparkles className="h-5 w-5 text-cyan-300" />,
        className: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
    },
} as const;

function StatusBadge({ status }: StatusBadgeProps) {
    const style = badgeStyles[status];

    return (
        <div
            className={`flex items-center gap-3 px-3 py-2 rounded-full text-base font-bold uppercase tracking-[0.15em] backdrop-blur-md shadow-lg shadow-black/20 select-none border ${style.className}`}
        >
            <span>{style.icon}</span>
            <span>{status}</span>
        </div>
    );
}

export default memo(StatusBadge);