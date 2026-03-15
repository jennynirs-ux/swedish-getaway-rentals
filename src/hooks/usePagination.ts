import { useState, useMemo } from 'react';

interface UsePaginationOptions {
  initialPage?: number;
  pageSize?: number;
}

interface UsePaginationReturn<T> {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  paginatedData: T[];
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function usePagination<T>(data: T[], options: UsePaginationOptions = {}): UsePaginationReturn<T> {
  const { initialPage = 1, pageSize = 12 } = options;
  const [currentPage, setCurrentPage] = useState(initialPage);

  const { totalPages, paginatedData, hasNextPage, hasPrevPage } = useMemo(() => {
    const total = Math.ceil(data.length / pageSize);
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const paginated = data.slice(startIdx, endIdx);
    const hasNext = currentPage < total;
    const hasPrev = currentPage > 1;

    return {
      totalPages: total,
      paginatedData: paginated,
      hasNextPage: hasNext,
      hasPrevPage: hasPrev,
    };
  }, [data, currentPage, pageSize]);

  const goToPage = (page: number) => {
    const pageNum = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNum);
  };

  const nextPage = () => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  };

  return {
    currentPage,
    pageSize,
    totalPages,
    paginatedData,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage,
  };
}
