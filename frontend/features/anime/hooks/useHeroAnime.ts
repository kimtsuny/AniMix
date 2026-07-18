import { useEffect, useState } from "react";

import { getHeroAnime } from "../api/services/home/hero.service";
import type { HeroAnime } from "../types/hero";

export function useHeroAnime() {
    const [data, setData] = useState<HeroAnime[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function fetchHeroAnime() {
            try {
                const heroAnime = await getHeroAnime();

                setData(heroAnime);
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        }

        fetchHeroAnime();
    }, []);

    return {
        data,
        loading,
        error,
    };
}