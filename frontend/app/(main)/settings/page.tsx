import type { Metadata } from "next";
import { Settings } from "lucide-react";

export const metadata: Metadata = {
  title: "Settings - AniMix",
  description: "Configure your playback and app preferences.",
};

export default function SettingsPage() {
  return (
    <div className="w-full max-w-xl mx-auto px-6 pt-24 md:pt-32 pb-16 flex flex-col items-center justify-center text-center">
      <div className="relative mb-6">
        <div
          className="absolute inset-0 rounded-full blur-3xl opacity-20"
          style={{
            background: "radial-gradient(circle, rgba(168,85,247,0.6) 0%, transparent 70%)",
            transform: "scale(2.5)",
          }}
        />
        <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/10 shadow-xl backdrop-blur-md">
          <Settings className="w-10 h-10 text-white/70" strokeWidth={1.5} />
        </div>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">
        Settings
      </h1>

      <p className="text-neutral-400 text-sm md:text-base max-w-sm leading-relaxed">
        Application and playback preferences will be available in an upcoming update.
      </p>
    </div>
  );
}
