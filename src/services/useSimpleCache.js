// hooks/useSimpleCache.js
import { useState, useEffect } from 'react';

export const useSimpleCache = (key, fetchFunction) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      // Check cache first
      const cached = localStorage.getItem(`cache_${key}`);
      if (cached) {
        const cachedData = JSON.parse(cached);
        setData(cachedData);
        setLoading(false);
        
        // Fetch fresh data in background (optional)
        try {
          const freshData = await fetchFunction();
          setData(freshData);
          localStorage.setItem(`cache_${key}`, JSON.stringify(freshData));
        } catch (error) {
          console.log('Background refresh failed, using cached data');
        }
        return;
      }

      // No cache, fetch new data
      try {
        const newData = await fetchFunction();
        setData(newData);
        localStorage.setItem(`cache_${key}`, JSON.stringify(newData));
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [key, fetchFunction]);

  const refresh = async () => {
    setLoading(true);
    try {
      const newData = await fetchFunction();
      setData(newData);
      localStorage.setItem(`cache_${key}`, JSON.stringify(newData));
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, refresh };
};