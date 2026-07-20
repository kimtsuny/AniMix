"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import NavigationItem from "./NavigationItem";
import SearchButton from "./SearchButton";
import { navigationItems } from "./navigation";
import { useSearchStore } from "@/features/search";

export default function BottomNavigation() {
    const pathname = usePathname();
    const { isOpen, openSearch, closeSearch } = useSearchStore();

    const toggleSearch = () => {
        if (isOpen) {
            closeSearch();
        } else {
            openSearch();
        }
    };

    return (
        <div
            className="
                fixed bottom-7 left-1/2 -translate-x-1/2 z-50
                flex items-center gap-3
            "
        >
            <motion.nav
                layout
                transition={{
                    layout: {
                        duration: 0.35,
                        ease: [0.4, 0, 0.2, 1],
                    },
                }}
                className={`
                    flex items-center
                    bg-zinc-950/80
                    backdrop-blur-2xl
                    border border-white/25
                    rounded-full
                    shadow-[0_8px_32px_rgba(0,0,0,0.55),0_0_12px_rgba(255,255,255,0.06)]
                    overflow-hidden
                    gap-2 px-3 py-2
                `}
                style={{
                    willChange: "width",
                }}
            >
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key="nav-items"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-2"
                    >
                        {navigationItems.map((item) => (
                            <NavigationItem
                                key={item.path}
                                item={item}
                                isActive={pathname.startsWith(item.path)}
                            />
                        ))}
                    </motion.div>
                </AnimatePresence>
            </motion.nav>

            <SearchButton isSearchOpen={isOpen} onToggle={toggleSearch} />
        </div>
    );
}