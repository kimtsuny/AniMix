"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import { UserMenu } from "@/features/auth";

const navLinks = [
  { label: "Home", path: "/" },
  { label: "Anime", path: "/anime" },
  { label: "Manga", path: "/manga" },
  { label: "Manhwa", path: "/manhwa" },
];

export default function Header() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 md:px-12 transition-all duration-300 ${
        isScrolled
          ? "bg-black/10 backdrop-blur-2xl py-3"
          : "bg-transparent py-5"
      }`}
    >
      <Logo />

      <nav className="hidden sm:flex items-center gap-6 md:gap-8">
        {navLinks.map((link) => {
          const isActive = pathname === link.path;

          return (
            <Link
              key={link.path}
              href={link.path}
              className={`text-sm font-medium transition-colors duration-300 ${
                isActive
                  ? "text-white font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <UserMenu />
    </header>
  );
}