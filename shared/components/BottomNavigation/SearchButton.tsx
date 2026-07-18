import { Search, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface SearchButtonProps {
    isSearchOpen: boolean;
    onToggle: () => void;
}

export default function SearchButton({
    isSearchOpen,
    onToggle,
}: SearchButtonProps) {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-label={isSearchOpen ? "Close search" : "Open search"}
            className="
                flex items-center justify-center
                w-14 h-14
                rounded-full
                bg-white
                text-black
                border border-white/70
                shadow-xl shadow-black/40
                transition-all duration-200 ease-out
                hover:scale-105 hover:bg-zinc-100
                active:scale-95
                cursor-pointer
                relative
                overflow-hidden
            "
        >
            <AnimatePresence mode="wait" initial={false}>
                {isSearchOpen ? (
                    <motion.span
                        key="x"
                        initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                        animate={{ rotate: 0, opacity: 1, scale: 1 }}
                        exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="flex items-center justify-center"
                    >
                        <X size={24} strokeWidth={2} />
                    </motion.span>
                ) : (
                    <motion.span
                        key="search"
                        initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
                        animate={{ rotate: 0, opacity: 1, scale: 1 }}
                        exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="flex items-center justify-center"
                    >
                        <Search size={24} strokeWidth={2} />
                    </motion.span>
                )}
            </AnimatePresence>
        </button>
    );
}