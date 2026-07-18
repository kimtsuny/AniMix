"use client";

import { forwardRef } from "react";
import { Search } from "lucide-react";

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    onEscape: () => void;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
    ({ value, onChange, onEscape }, ref) => {
        return (
            <div className="flex items-center gap-3 w-full px-4">
                <Search
                    size={22}
                    strokeWidth={2}
                    className="text-white/50 shrink-0"
                />
                <input
                    ref={ref}
                    autoFocus
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") {
                            onEscape();
                        }
                    }}
                    placeholder="Search anime..."
                    className="
                        w-full bg-transparent
                        text-white text-base
                        placeholder:text-white/35
                        outline-none border-none
                        py-2
                    "
                    aria-label="Search anime"
                />
            </div>
        );
    }
);

SearchInput.displayName = "SearchInput";

export default SearchInput;
