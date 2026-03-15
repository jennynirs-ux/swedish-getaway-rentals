import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PropertyCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="relative h-64">
        {/* Image placeholder */}
        <Skeleton className="w-full h-full rounded-none" />
      </div>

      <CardHeader className="pb-3">
        <div className="space-y-2">
          {/* Title skeleton - 60% width */}
          <Skeleton className="h-6 w-3/5" />

          {/* Location skeleton - 40% width */}
          <Skeleton className="h-4 w-2/5" />
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Description skeleton - 2 lines */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>

        {/* Info items skeleton - beds, guests, bathrooms */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>

        {/* Amenities skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        {/* Price and button skeleton */}
        <div className="flex items-center justify-between pt-2">
          <div className="space-y-1">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}
