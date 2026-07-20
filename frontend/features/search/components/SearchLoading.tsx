export function SearchLoading() {
  return (
    <div className="flex flex-col py-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-3 mx-2 my-1 rounded-xl"
        >
          {/* Skeleton Poster */}
          <div className="w-12 h-[72px] rounded-lg shrink-0 bg-white/5 animate-pulse" />

          {/* Skeleton Content */}
          <div className="flex flex-col flex-1 justify-center gap-3">
            <div className="h-4 bg-white/5 rounded-md w-3/4 animate-pulse" />
            <div className="h-3 bg-white/5 rounded-md w-1/2 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
