import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Ghost } from "lucide-react";

export default function AnimeNotFound() {
  return (
    <div className="dark min-h-[80vh] flex flex-col items-center justify-center p-4 bg-black text-white text-center">
      <Ghost className="h-24 w-24 text-muted-foreground/30 mb-6 animate-pulse" />
      <h2 className="text-3xl font-bold tracking-tight mb-2">Anime Not Found</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        The anime you are looking for doesn't exist or has been removed from our database.
      </p>
      <Link href="/" className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
        Browse Anime
      </Link>
    </div>
  );
}
