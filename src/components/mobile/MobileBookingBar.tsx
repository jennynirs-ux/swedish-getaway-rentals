'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

interface MobileBookingBarProps {
  pricePerNight: number;
  currency: string;
  onBookClick: () => void;
  isAvailable?: boolean;
}

export function MobileBookingBar({ pricePerNight, currency, onBookClick, isAvailable = true }: MobileBookingBarProps) {
  const formattedPrice = currency === 'SEK'
    ? `${pricePerNight.toLocaleString('sv-SE')} kr`
    : `€${pricePerNight.toLocaleString('en-EU')}`;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border p-4 pb-safe">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold">{formattedPrice}</p>
          <p className="text-xs text-muted-foreground">per night</p>
        </div>
        <Button
          onClick={onBookClick}
          disabled={!isAvailable}
          size="lg"
          className="bg-primary hover:bg-primary/90 text-white px-8"
        >
          {isAvailable ? 'Book Now' : 'Not Available'}
        </Button>
      </div>
    </div>
  );
}
