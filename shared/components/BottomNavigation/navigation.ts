export interface NavigationItemConfig {
    label: string;
    path: string;
}

export const navigationItems: NavigationItemConfig[] = [
    { label: "Anime", path: "/anime" },
    { label: "Manga", path: "/manga" },
    { label: "Manhwa", path: "/manhwa" },
];

export const searchRoute = "/search";
