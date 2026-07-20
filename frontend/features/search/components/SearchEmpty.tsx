import { SearchX } from "lucide-react";

export function SearchEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="bg-white/5 p-4 rounded-full mb-4">
        <SearchX size={32} className="text-white/30" strokeWidth={1.5} />
      </div>
      <h3 className="text-white/90 font-medium text-lg mb-1">
        No anime found
      </h3>
      <p className="text-white/50 text-sm">
        Try adjusting your search terms or try another title.
      </p>
    </div>
  );
}
