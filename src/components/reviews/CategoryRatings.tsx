'use client';

import React from 'react';
import { Star, SprayCanIcon, MapPin, MessageCircle, KeyRound, CheckCircle, Banknote } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export interface CategoryRating {
  category: string;
  label: string;
  score: number;
  icon: React.ElementType;
}

const DEFAULT_CATEGORIES: Omit<CategoryRating, 'score'>[] = [
  { category: 'cleanliness', label: 'Cleanliness', icon: SprayCanIcon },
  { category: 'accuracy', label: 'Accuracy', icon: CheckCircle },
  { category: 'communication', label: 'Communication', icon: MessageCircle },
  { category: 'location', label: 'Location', icon: MapPin },
  { category: 'checkin', label: 'Check-in', icon: KeyRound },
  { category: 'value', label: 'Value', icon: Banknote },
];

interface CategoryRatingsProps {
  ratings: Record<string, number>;
  overallRating: number;
  totalReviews: number;
}

export function CategoryRatings({ ratings, overallRating, totalReviews }: CategoryRatingsProps) {
  return (
    <div className="space-y-6">
      {/* Overall rating */}
      <div className="flex items-center gap-3">
        <Star className="h-6 w-6 fill-primary text-primary" />
        <span className="text-2xl font-semibold">{overallRating.toFixed(1)}</span>
        <span className="text-muted-foreground">({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})</span>
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {DEFAULT_CATEGORIES.map(({ category, label, icon: Icon }) => {
          const score = ratings[category] ?? 0;
          return (
            <div key={category} className="flex items-center gap-3">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm min-w-[100px]">{label}</span>
              <Progress value={score * 20} className="flex-1 h-2" />
              <span className="text-sm font-medium w-8 text-right">{score.toFixed(1)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
