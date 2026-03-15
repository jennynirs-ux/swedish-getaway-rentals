import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from '../usePagination';

describe('usePagination', () => {
  describe('initialization and page count', () => {
    it('should initialize with page 1 by default', () => {
      const data = ['item1', 'item2', 'item3'];
      const { result } = renderHook(() => usePagination(data));
      expect(result.current.currentPage).toBe(1);
    });

    it('should initialize with custom initial page', () => {
      const data = Array.from({ length: 50 }, (_, i) => `item${i + 1}`);
      const { result } = renderHook(() => usePagination(data, { initialPage: 3 }));
      expect(result.current.currentPage).toBe(3);
    });

    it('should calculate correct page count', () => {
      const data = Array.from({ length: 25 }, (_, i) => `item${i + 1}`);
      const { result } = renderHook(() => usePagination(data, { pageSize: 12 }));
      expect(result.current.totalPages).toBe(3);
    });

    it('should calculate correct page count with even division', () => {
      const data = Array.from({ length: 24 }, (_, i) => `item${i + 1}`);
      const { result } = renderHook(() => usePagination(data, { pageSize: 12 }));
      expect(result.current.totalPages).toBe(2);
    });

    it('should handle single page', () => {
      const data = ['item1', 'item2'];
      const { result } = renderHook(() => usePagination(data, { pageSize: 12 }));
      expect(result.current.totalPages).toBe(1);
    });

    it('should use default page size of 12', () => {
      const data = Array.from({ length: 25 }, (_, i) => `item${i + 1}`);
      const { result } = renderHook(() => usePagination(data));
      expect(result.current.pageSize).toBe(12);
    });

    it('should use custom page size', () => {
      const data = Array.from({ length: 30 }, (_, i) => `item${i + 1}`);
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }));
      expect(result.current.pageSize).toBe(10);
      expect(result.current.totalPages).toBe(3);
    });

    it('should handle empty data', () => {
      const data: string[] = [];
      const { result } = renderHook(() => usePagination(data));
      expect(result.current.totalPages).toBe(0);
    });
  });

  describe('pagination data slicing', () => {
    it('should return correct items for first page', () => {
      const data = Array.from({ length: 25 }, (_, i) => `item${i + 1}`);
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }));
      expect(result.current.paginatedData).toEqual([
        'item1', 'item2', 'item3', 'item4', 'item5',
        'item6', 'item7', 'item8', 'item9', 'item10',
      ]);
    });

    it('should return correct items for second page', () => {
      const data = Array.from({ length: 25 }, (_, i) => `item${i + 1}`);
      const { result } = renderHook(() => usePagination(data, { pageSize: 10, initialPage: 2 }));
      expect(result.current.paginatedData).toEqual([
        'item11', 'item12', 'item13', 'item14', 'item15',
        'item16', 'item17', 'item18', 'item19', 'item20',
      ]);
    });

    it('should handle partial last page', () => {
      const data = Array.from({ length: 25 }, (_, i) => `item${i + 1}`);
      const { result } = renderHook(() => usePagination(data, { pageSize: 10, initialPage: 3 }));
      expect(result.current.paginatedData).toEqual([
        'item21', 'item22', 'item23', 'item24', 'item25',
      ]);
    });

    it('should return all items for single page', () => {
      const data = Array.from({ length: 5 }, (_, i) => `item${i + 1}`);
      const { result } = renderHook(() => usePagination(data, { pageSize: 12 }));
      expect(result.current.paginatedData).toEqual(data);
    });

    it('should return empty array for empty data', () => {
      const data: string[] = [];
      const { result } = renderHook(() => usePagination(data));
      expect(result.current.paginatedData).toEqual([]);
    });
  });

  describe('page navigation', () => {
    it('should navigate to next page', () => {
      const data = Array.from({ length: 25 }, (_, i) => `item${i + 1}`);
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }));
      expect(result.current.currentPage).toBe(1);
      act(() => {
        result.current.nextPage();
      });
      expect(result.current.currentPage).toBe(2);
    });

    it('should navigate to previous page', () => {
      const data = Array.from({ length: 25 }, (_, i) => `item${i + 1}`);
      const { result } = renderHook(() => usePagination(data, { pageSize: 10, initialPage: 2 }));
      expect(result.current.currentPage).toBe(2);
      act(() => {
        result.current.prevPage();
      });
      expect(result.current.currentPage).toBe(1);
    });

    it('should navigate to specific page', () => {
      const data = Array.from({ length: 50 }, (_, i) => `item${i + 1}`);
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }));
      act(() => {
        result.current.goToPage(3);
      });
      expect(result.current.currentPage).toBe(3);
    });

    it('should not go beyond last page', () => {
      const data = Array.from({ length: 25 }, (_, i) => `item${i + 1}`);
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }));
      act(() => {
        result.current.goToPage(10);
      });
      expect(result.current.currentPage).toBe(3);
    });

    it('should not go below page 1', () => {
      const data = Array.from({ length: 25 }, (_, i) => `item${i + 1}`);
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }));
      act(() => {
        result.current.goToPage(-1);
      });
      expect(result.current.currentPage).toBe(1);
    });

    it('should not go to page 0', () => {
      const data = Array.from({ length: 25 }, (_, i) => `item${i + 1}`);
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }));
      act(() => {
        result.current.goToPage(0);
      });
      expect(result.current.currentPage).toBe(1);
    });
  });

  describe('page bounds', () => {
    it('should indicate when has next page', () => {
      const data = Array.from({ length: 25 }, (_, i) => `item${i + 1}`);
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }));
      expect(result.current.hasNextPage).toBe(true);
      act(() => {
        result.current.goToPage(3);
      });
      expect(result.current.hasNextPage).toBe(false);
    });

    it('should indicate when has previous page', () => {
      const data = Array.from({ length: 25 }, (_, i) => `item${i + 1}`);
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }));
      expect(result.current.hasPrevPage).toBe(false);
      act(() => {
        result.current.nextPage();
      });
      expect(result.current.hasPrevPage).toBe(true);
    });

    it('should not allow next page when on last page', () => {
      const data = Array.from({ length: 25 }, (_, i) => `item${i + 1}`);
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }));
      act(() => {
        result.current.goToPage(3);
      });
      const currentPage = result.current.currentPage;
      act(() => {
        result.current.nextPage();
      });
      expect(result.current.currentPage).toBe(currentPage);
    });

    it('should not allow previous page when on first page', () => {
      const data = Array.from({ length: 25 }, (_, i) => `item${i + 1}`);
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }));
      const currentPage = result.current.currentPage;
      act(() => {
        result.current.prevPage();
      });
      expect(result.current.currentPage).toBe(currentPage);
    });

    it('should have no next or previous for single page', () => {
      const data = Array.from({ length: 5 }, (_, i) => `item${i + 1}`);
      const { result } = renderHook(() => usePagination(data, { pageSize: 12 }));
      expect(result.current.hasNextPage).toBe(false);
      expect(result.current.hasPrevPage).toBe(false);
    });
  });

  describe('data changes', () => {
    it('should update pagination when data changes', () => {
      let data = Array.from({ length: 10 }, (_, i) => `item${i + 1}`);
      const { result, rerender } = renderHook(
        ({ data: d }) => usePagination(d, { pageSize: 5 }),
        { initialProps: { data } }
      );
      expect(result.current.totalPages).toBe(2);

      data = Array.from({ length: 20 }, (_, i) => `item${i + 1}`);
      rerender({ data });
      expect(result.current.totalPages).toBe(4);
    });

    it('should maintain page number when data updates', () => {
      let data = Array.from({ length: 30 }, (_, i) => `item${i + 1}`);
      const { result, rerender } = renderHook(
        ({ data: d }) => usePagination(d, { pageSize: 10 }),
        { initialProps: { data } }
      );
      act(() => {
        result.current.goToPage(2);
      });
      expect(result.current.currentPage).toBe(2);

      data = Array.from({ length: 50 }, (_, i) => `item${i + 1}`);
      rerender({ data });
      expect(result.current.currentPage).toBe(2);
    });

    it('should handle data becoming empty', () => {
      let data = Array.from({ length: 10 }, (_, i) => `item${i + 1}`);
      const { result, rerender } = renderHook(
        ({ data: d }) => usePagination(d, { pageSize: 5 }),
        { initialProps: { data } }
      );
      expect(result.current.totalPages).toBe(2);

      data = [];
      rerender({ data });
      expect(result.current.totalPages).toBe(0);
      expect(result.current.paginatedData).toEqual([]);
    });
  });

  describe('complex data types', () => {
    it('should work with objects', () => {
      const data = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
      }));
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }));
      expect(result.current.paginatedData.length).toBe(10);
      expect(result.current.paginatedData[0].id).toBe(1);
    });

    it('should work with nested objects', () => {
      const data = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        details: { name: `Item ${i + 1}`, value: i },
      }));
      const { result } = renderHook(() => usePagination(data, { pageSize: 5 }));
      expect(result.current.paginatedData[0].details.name).toBe('Item 1');
    });
  });
});
