"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const INTRO_DURATION = 1800; // ms before fade-out begins
const SESSION_KEY = "animehub-intro-seen";

export default function IntroLoader() {
    const [show, setShow] = useState<boolean | null>(null);

    useEffect(() => {
        // Only show once per session
        if (sessionStorage.getItem(SESSION_KEY)) {
            setShow(false);
            return;
        }

        setShow(true);
        sessionStorage.setItem(SESSION_KEY, "1");

        const timer = setTimeout(() => setShow(false), INTRO_DURATION);
        return () => clearTimeout(timer);
    }, []);

    // Before hydration, render nothing (prevents flash)
    if (show === null) return null;

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    key="intro-loader"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
                    aria-hidden="true"
                >
                    <div className="flex  flex-col items-center gap-8">
                        {/* Soft red glow behind logo */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                                duration: 1.0,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                            className="relative"
                        >
                            {/* Glow layer */}
                            <div
                                className="absolute inset-0 -inset-x-12 -inset-y-8 rounded-full blur-[60px] opacity-40"
                                style={{
                                    background:
                                        "radial-gradient(ellipse at center, rgba(229, 57, 70, 0.5) 0%, rgba(229, 57, 70, 0) 70%)",
                                }}
                            />

                            {/* Logo text */}
                            <h1 className="relative text-4xl font-bold tracking-tight text-white sm:text-5xl">
                                Anime<span className="text-[#e53946]">Hub</span>
                            </h1>
                        </motion.div>

                        {/* Loading bar */}
                        <div className="w-40 overflow-hidden rounded-full sm:w-48">
                            <div className="h-[2px] w-full rounded-full bg-white/10">
                                <motion.div
                                    initial={{ width: "0%" }}
                                    animate={{ width: "100%" }}
                                    transition={{
                                        duration: INTRO_DURATION / 1000 - 0.1,
                                        ease: [0.25, 0.1, 0.25, 1],
                                    }}
                                    className="h-full rounded-full bg-gradient-to-r from-[#e53946] to-[#ff6b6b]"
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
