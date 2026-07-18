import { Clapperboard, Heart, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavigationItemConfig {
    ariaLabel: string;
    path: string;
    icon: LucideIcon;
}

export const navigationItems: NavigationItemConfig[] = [
    {
        ariaLabel: "Anime",
        path: "/anime",
        icon: Clapperboard,
    },
    {
        ariaLabel: "Favorites",
        path: "/favorites",
        icon: Heart,
    },
    {
        ariaLabel: "Settings",
        path: "/settings",
        icon: Settings,
    },
];

export const searchRoute = "/search";