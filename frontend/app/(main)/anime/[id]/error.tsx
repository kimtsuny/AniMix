"use client";

import { useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import Link from "next/link";

export default function AnimeDetailsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="dark min-h-screen flex flex-col items-center justify-center p-4 bg-black text-white text-center">
      <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
      <h2 className="text-2xl font-bold tracking-tight mb-2">Something went wrong!</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        We encountered an unexpected error while loading this anime's details. Please try again later.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Button onClick={reset} size="lg" className="gap-2">
          <RefreshCcw className="h-4 w-4" /> Try again
        </Button>
        <Link href="/" className="inline-flex h-9 items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
          Return Home
        </Link>
      </div>
    </div>
  );
}
