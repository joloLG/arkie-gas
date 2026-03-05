import { useState, useEffect, useCallback } from 'react';

// Simple in-memory cache for API responses
class DataCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 5 * 60 * 1000; // 5 minutes TTL

  set(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  clear() {
    this.cache.clear();
  }
}

export const dataCache = new DataCache();

// Optimized data fetching hook with caching and loading states
export function useOptimizedData<T>(
  key: string,
  fetcher: () => Promise<{ data?: T; error?: any }>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check cache first
      const cached = dataCache.get(key);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }

      const result = await fetcher();
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setData(result.data);
        dataCache.set(key, result.data);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [key, fetcher]);

  useEffect(() => {
    fetchData();
  }, dependencies);

  const refetch = useCallback(() => {
    dataCache.clear();
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

// Parallel data fetching utility
export async function fetchParallel<T>(...promises: Promise<{ data?: T; error?: any }>[]): Promise<{
  data: T[];
  errors: any[];
}> {
  try {
    const results = await Promise.allSettled(promises);
    
    const data: T[] = [];
    const errors: any[] = [];
    
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.data) {
        data.push(result.value.data);
      } else if (result.status === 'rejected') {
        errors.push(result.reason);
      } else if (result.value.error) {
        errors.push(result.value.error);
      }
    });
    
    return { data, errors };
  } catch (err) {
    return { data: [], errors: [err] };
  }
}

// Debounce utility for search/filter inputs
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
