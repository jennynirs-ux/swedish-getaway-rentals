'use client';

import React from 'react';
import { CategoryRatings } from './CategoryRatings';
import { ReviewCard } from './ReviewCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Review {
  id: string;
  guestName: string;
  guestAvatar?: string;
  rating: number;
  message: string;
  stayDate?: string;
  createdAt: string;
  hostResponse?: string;
  isVerifiedStay?: boolean;
  helpfulCount?: number;
}

interface ReviewSummaryProps {
  reviews: Review[];
  categoryRatings: Record<string, number>;
  overallRating: number;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function ReviewSummary({ reviews, categoryRatings, overallRating, onLoadMore, hasMore }: ReviewSummaryProps) {
  const [sortBy, setSortBy] = React.useState('newest');

  const sortedReviews = React.useMemo(() => {
    const sorted = [...reviews];
    switch (sortBy) {
      case 'newest': return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'highest': return sorted.sort((a, b) => b.rating - a.rating);
      case 'lowest': return sorted.sort((a, b) => a.rating - b.rating);
      default: return sorted;
    }
  }, [reviews, sortBy]);

  return (
    <div className="space-y-6">
      <CategoryRatings ratings={categoryRatings} overallRating={overallRating} totalReviews={reviews.length} />

      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Guest reviews</h3>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="highest">Highest rated</SelectItem>
            <SelectItem value="lowest">Lowest rated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        {sortedReviews.map(review => (
          <ReviewCard key={review.id} {...review} />
        ))}
      </div>

      {hasMore && onLoadMore && (
        <div className="text-center pt-4">
          <Button variant="outline" onClick={onLoadMore}>Show more reviews</Button>
        </div>
      )}
    </div>
  );
}
