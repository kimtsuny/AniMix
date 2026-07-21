"use client";

import { useEffect, useState } from "react";
import Logo from "./Logo";
import { UserMenu } from "@/features/auth";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
useEffect(() => {
  const handleScroll = () => {
    setIsScrolled(window.scrollY > 60);
  };

  window.addEventListener("scroll", handleScroll, {
    passive: true,
  });

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
      <UserMenu />
    </header>
  );
}