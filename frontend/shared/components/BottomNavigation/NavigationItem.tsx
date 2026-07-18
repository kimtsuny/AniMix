import Link from "next/link";
import type { NavigationItemConfig } from "./navigation";

interface NavigationItemProps {
    item: NavigationItemConfig;
    isActive: boolean;
}

export default function NavigationItem({
    item,
    isActive,
}: NavigationItemProps) {
    const Icon = item.icon;

    return (
        <Link
            href={item.path}
            aria-label={item.ariaLabel}
            className={`
                flex items-center justify-center
                w-16 h-10
                rounded-full
                transition-all duration-200 ease-out
                ${
                    isActive
                        ? "bg-white text-black shadow-lg shadow-white/10"
                        : "text-white/55 hover:text-white hover:bg-white/8"
                }
            `}
        >
            <Icon size={23} strokeWidth={1.9} />
        </Link>
    );
}