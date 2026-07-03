import Link from "next/link";
import type { NavigationItemConfig } from "./navigation";

interface NavigationItemProps {
    item: NavigationItemConfig;
    isActive: boolean;
}

export default function NavigationItem({ item, isActive }: NavigationItemProps) {
    return (
        <Link
            href={item.path}
            className={`
        relative z-10 px-5 py-2 rounded-full text-sm font-normal
        transition-all duration-75 ease-in-out
        ${isActive
                    ? "bg-white text-black shadow-lg shadow-white/20"
                    : "bg-transparent text-white/80 hover:text-white hover:bg-white/10"
                }
      `}
        >
            {item.label}
        </Link>
    );
}
