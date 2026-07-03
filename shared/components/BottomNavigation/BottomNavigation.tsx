"use client";

import { usePathname } from "next/navigation";
import NavigationItem from "./NavigationItem";
import SearchButton from "./SearchButton";
import { navigationItems } from "./navigation";

export default function BottomNavigation() {
    const pathname = usePathname();

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 w-fit">
            {/* Navigation Bar Container */}
            <nav
                className="
                    flex items-center gap-1
                    px-2 py-2
                    bg-black/70 backdrop-blur-xl
                    border border-white/10
                    rounded-full shadow-2xl shadow-black/50
                "
            >
                {navigationItems.map((item) => (
                    <NavigationItem
                        key={item.path}
                        item={item}
                        isActive={pathname.startsWith(item.path)}
                    />
                ))}
            </nav>

            {/* Search Button (Separate Floating FAB) */}
            <SearchButton />
        </div>
    );
}
