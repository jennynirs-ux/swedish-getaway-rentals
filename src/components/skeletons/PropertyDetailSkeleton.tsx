import { Skeleton } from "@/components/ui/skeleton";

export function PropertyDetailSkeleton() {
  return (
    <div className="space-y-8">
      {/* Hero image placeholder - full width, aspect-[21/9] height */}
      <div className="w-full aspect-[21/9]">
        <Skeleton className="w-full h-full rounded-lg" />
      </div>

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title and location */}
            <div className="space-y-3">
              {/* Title skeleton */}
              <Skeleton className="h-8 w-3/4" />

              {/* Location skeleton */}
              <Skeleton className="h-5 w-1/2" />
            </div>

            {/* Info boxes grid - 4 items */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2 p-4 border rounded-lg">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>

            {/* Description paragraph - 3 lines */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>

            {/* Amenities section */}
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-2 p-4 border rounded-lg">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            </div>

            {/* Additional content section */}
            <div className="space-y-4">
              <Skeleton className="h-6 w-40" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>

          {/* Sidebar - booking form placeholder */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 p-6 border rounded-lg space-y-4 bg-muted/20">
              {/* Price skeleton */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-7 w-32" />
              </div>

              {/* Date pickers */}
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>

              {/* Guests selector */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>

              {/* Booking button */}
              <Skeleton className="h-11 w-full rounded-md" />

              {/* Divider and extra info */}
              <div className="space-y-3 pt-4 border-t">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>

              {/* Total skeleton */}
              <div className="flex justify-between pt-4 border-t">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
