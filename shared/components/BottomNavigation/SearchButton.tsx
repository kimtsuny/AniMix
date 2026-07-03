import Link from "next/link";
import { searchRoute } from "./navigation";

export default function SearchButton() {
    return (
        <Link
            href={searchRoute}
            aria-label="Search"
            className="
                flex items-center justify-center
                w-12 h-12 rounded-full
                bg-black/70 backdrop-blur-xl
                text-white
                border border-white/10
                shadow-2xl shadow-black/50
                transition-all duration-300 ease-in-out
                hover:scale-110 hover:shadow-white/10
                active:scale-95
            "
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
            >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
            </svg>
        </Link>
    );
}
