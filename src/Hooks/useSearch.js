import { useState, useEffect } from 'react';
import { Toast } from 'antd-mobile';

const useSearch = (initialData = [], searchFields = ['name', 'title']) => {
  const [data, setData] = useState(initialData);
  const [filteredData, setFilteredData] = useState(initialData);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTab, setCurrentTab] = useState('all');
  const [userLocation, setUserLocation] = useState('');
  const [city, setCity] = useState('');

  const handleSearch = (query, tab = currentTab) => {
    setSearchQuery(query);
    setCurrentTab(tab);
    let filtered = [...data];

    if (tab !== 'all') {
      filtered = filtered.filter(item =>
        item.type === tab || item.category === tab || item.listingType === tab
      );
    }

    if (query.trim()) {
      filtered = filtered.filter(item =>
        searchFields.some(field =>
          item[field]?.toLowerCase().includes(query.toLowerCase())
        )
      );
    }

    if (userLocation) {
      filtered.sort((a, b) => {
        const aInLocation = a.location?.toLowerCase().includes(userLocation.toLowerCase());
        const bInLocation = b.location?.toLowerCase().includes(userLocation.toLowerCase());
        if (aInLocation && !bInLocation) return -1;
        if (!aInLocation && bInLocation) return 1;
        return (b.rating || 0) - (a.rating || 0);
      });
    }

    setFilteredData(filtered);
  };

  // ✅ Listen for live location updates
  useEffect(() => {
    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "LIVE_LOCATION_UPDATE") {
          const { city, latitude, longitude } = data.payload;
          setCity(city);
          setUserLocation(city);
          Toast.show({ icon: "success", content: `📍 Live: ${city}` });
        }
      } catch (err) {
        console.warn("Invalid location message:", err);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Initialize with saved location
  useEffect(() => {
    const savedCity = localStorage.getItem('userCity');
    if (savedCity) {
      setCity(savedCity);
      setUserLocation(savedCity);
    }
  }, []);

  useEffect(() => {
    handleSearch(searchQuery, currentTab);
  }, [data, userLocation]);

  return {
    data: filteredData,
    city,
    setCity,
    userLocation,
    handleSearch,
    updateData: setData,
  };
};

export default useSearch;