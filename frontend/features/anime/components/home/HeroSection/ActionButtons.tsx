"use client";

import { memo } from "react";
import { MoreHorizontal, Play } from "lucide-react";

interface ActionButtonsProps {
    onWatchNow?: () => void;
    onMoreActions?: () => void;
}

function ActionButtons({
    onWatchNow,
    onMoreActions,
}: ActionButtonsProps) {
    return (
        <div className="flex items-center gap-3 w-full">
            <button
                onClick={onWatchNow}
                className="flex items-center justify-center gap-2 px-12 py-4 h-12 rounded-full text-sm font-semibold bg-white text-black hover:bg-neutral-200 active:scale-95 transition-all shadow-lg shadow-white/10 outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black cursor-pointer"
                aria-label="Watch Now"
            >
                <Play className="h-4 w-4 fill-black" />
                <span>Watch Now</span>
            </button>

            <button
                onClick={onMoreActions}
                className="flex items-center justify-center h-9 w-9 shrink-0 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black cursor-pointer"
                aria-label="More Actions"
            >
                <MoreHorizontal className="h-5 w-5 text-white" />
            </button>
        </div>
    );
}

export default memo(ActionButtons);
