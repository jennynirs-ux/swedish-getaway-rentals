import { PropertyCardSkeleton } from "./PropertyCardSkeleton";

interface PropertyListSkeletonProps {
  count?: number;
}

export function PropertyListSkeleton({ count = 6 }: PropertyListSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(count)].map((_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  );
}
