'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCw } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileRefreshButtonProps {
  onRefresh: () => Promise<void>;
  isLoading?: boolean;
}

export function MobileRefreshButton({ onRefresh, isLoading = false }: MobileRefreshButtonProps) {
  const isMobile = useIsMobile();
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isMobile) {
    return null;
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex justify-center py-4">
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isRefreshing || isLoading}
        className="gap-2"
      >
        <RotateCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? 'Refreshing...' : 'Refresh'}
      </Button>
    </div>
  );
}
