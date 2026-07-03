export interface AnimeSectionItem {
    id: string;
    title: string;
    status: "Airing" | "Finished" | "Upcoming";
    type: "TV" | "Movie" | "OVA" | "ONA" | "Special";
    season: "Spring" | "Summer" | "Fall" | "Winter";
    year: number;
    imagePath: string;
}
