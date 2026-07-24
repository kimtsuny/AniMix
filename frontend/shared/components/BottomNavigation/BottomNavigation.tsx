"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import NavigationItem from "./NavigationItem";
import SearchButton from "./SearchButton";
import { navigationItems } from "./navigation";
import { useSearchStore } from "@/features/search";
import { SearchInput } from "@/features/search/components/SearchInput";
import { SearchResults } from "@/features/search/components/SearchResults";
import { SearchBackdropInline } from "@/features/search/components/SearchBackdropInline";

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
        <>
            {/* ── Backdrop ── */}
            <AnimatePresence>
                {isOpen && <SearchBackdropInline />}
            </AnimatePresence>

            {/* ── Bottom Bar Container ── */}
            <div
                className="
                    fixed bottom-7 left-1/2 -translate-x-1/2 z-50
                    flex items-center gap-3
                "
                style={{ width: isOpen ? "min(640px, calc(100% - 2rem))" : "auto" }}
            >
                {/* ── Main Bar ── */}
                <motion.nav
                    layout
                    transition={{
                        layout: {
                            duration: 0.4,
                            ease: [0.4, 0, 0.2, 1],
                        },
                    }}
                    className={`
                        relative flex items-center
                        bg-zinc-950/80
                        backdrop-blur-2xl
                        border border-white/25
                        rounded-full
                        shadow-[0_8px_32px_rgba(0,0,0,0.55),0_0_12px_rgba(255,255,255,0.06)]
                        overflow-visible
                        ${isOpen ? "flex-1 h-14 px-1" : "gap-2 px-3 py-2"}
                    `}
                    style={{
                        willChange: "width",
                    }}
                >
                    {/* ── Navigation Icons OR Search Input ── */}
                    <AnimatePresence mode="wait" initial={false}>
                        {isOpen ? (
                            <motion.div
                                key="search-input"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2, delay: 0.15 }}
                                className="flex-1 h-full"
                            >
                                <SearchInput />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="nav-items"
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.85 }}
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
                        )}
                    </AnimatePresence>

                    {/* ── Results Panel (above the bar) ── */}
                    <AnimatePresence>
                        {isOpen && <SearchResults />}
                    </AnimatePresence>
                </motion.nav>

                {/* ── Search / Close Button ── */}
                <SearchButton isSearchOpen={isOpen} onToggle={toggleSearch} />
            </div>
        </>
    );
}