'use client';

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, ThumbsUp, Flag, ChevronDown, ChevronUp, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface ReviewCardProps {
  guestName: string;
  guestAvatar?: string;
  rating: number;
  message: string;
  stayDate?: string;
  createdAt: string;
  hostResponse?: string;
  isVerifiedStay?: boolean;
  categoryRatings?: Record<string, number>;
  helpfulCount?: number;
  onHelpful?: () => void;
  onReport?: () => void;
}

export function ReviewCard({
  guestName,
  guestAvatar,
  rating,
  message,
  stayDate,
  createdAt,
  hostResponse,
  isVerifiedStay = false,
  helpfulCount = 0,
  onHelpful,
  onReport,
}: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = message.length > 300;
  const displayMessage = isLong && !expanded ? message.slice(0, 300) + '...' : message;
  const initials = guestName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="py-6 border-b last:border-b-0">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="h-10 w-10">
          {guestAvatar && <AvatarImage src={guestAvatar} alt={guestName} />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{guestName}</span>
            {isVerifiedStay && (
              <span className="flex items-center gap-1 text-xs text-green-700">
                <BadgeCheck className="h-3.5 w-3.5" />
                Verified stay
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className={`h-3.5 w-3.5 ${i <= rating ? 'fill-primary text-primary' : 'text-muted'}`} />
              ))}
            </div>
            <span>{format(new Date(createdAt), 'MMMM yyyy')}</span>
            {stayDate && <span>· Stayed {format(new Date(stayDate), 'MMMM yyyy')}</span>}
          </div>
        </div>
      </div>

      {/* Message */}
      <p className="text-sm leading-relaxed">{displayMessage}</p>
      {isLong && (
        <button onClick={() => setExpanded(!expanded)} className="text-sm font-medium text-primary mt-1 flex items-center gap-1">
          {expanded ? <><ChevronUp className="h-4 w-4" /> Show less</> : <><ChevronDown className="h-4 w-4" /> Read more</>}
        </button>
      )}

      {/* Host response */}
      {hostResponse && (
        <div className="mt-4 ml-4 p-3 bg-muted rounded-lg">
          <p className="text-xs font-medium mb-1">Host response</p>
          <p className="text-sm">{hostResponse}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 mt-3">
        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={onHelpful} aria-label="Mark as helpful">
          <ThumbsUp className="h-3.5 w-3.5 mr-1" />
          Helpful{helpfulCount > 0 && ` (${helpfulCount})`}
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={onReport} aria-label="Report review">
          <Flag className="h-3.5 w-3.5 mr-1" />
          Report
        </Button>
      </div>
    </div>
  );
}
