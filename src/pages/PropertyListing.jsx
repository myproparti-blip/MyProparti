import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'; 
import {
  Card, 
  Tag, 
  Empty,
  Image,
  Space,
  Badge,
  Toast,
  DotLoading,
  Ellipsis,
  Popup,
  List,
  Button,
  Grid,
  Modal,
  Selector,
  Slider,
  SpinLoading,
  PullToRefresh,
} from 'antd-mobile';
import { 
  EnvironmentOutline, 
  HeartOutline,
  MoreOutline,
  SetOutline,
  UserOutline,
  InformationCircleOutline,
  MessageOutline,
  FilterOutline,
  CloseOutline,
  AddOutline,
  BellOutline,
  TeamOutline,
  StarOutline,
  PhoneFill, 
  MailFill,
} from 'antd-mobile-icons';
import { getProperties, getMyProperties } from '../services/properties';
import { getProfile } from '../services/auth';
import { useNavigate } from 'react-router-dom';
import './PropertyListings.css';
import PostProperty from '../components/proparti/PostProperty';
import HeaderWithSearch from '../components/common/HeaderWithSearch';
import { getAgents } from '../services/agents';
import AdvertisementManager from '../components/common/AdvertisementManager';
import { advertisementService } from '../services/advertise';

// Cache storage for PropertyListing page
const propertyListingCache = {
  properties: null,
  agents: null,
  profile: null,
  advertisements: null,
  city: null,
  timestamp: null,
  CACHE_DURATION: 0, // DISABLED: Cache causing stale ads to show (set to 0 for no caching)
};

// Custom hook for cached data fetching
const useCachedData = (key, fetchFunction, dependencies = []) => {
  const [data, setData] = useState(propertyListingCache[key]);
  const [loading, setLoading] = useState(!propertyListingCache[key]);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (force = false) => {
    const isCacheValid = propertyListingCache.timestamp && 
                        (Date.now() - propertyListingCache.timestamp < propertyListingCache.CACHE_DURATION);

    if (!force && propertyListingCache[key] && isCacheValid) {
      setData(propertyListingCache[key]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchFunction();
      propertyListingCache[key] = result;
      propertyListingCache.timestamp = Date.now();
      setData(result);
    } catch (err) {
      setError(err);
      console.error(`Error fetching ${key}:`, err);
    } finally {
      setLoading(false);
    }
  }, [key, fetchFunction]);

  useEffect(() => {
    fetchData(false);
  }, [fetchData, ...dependencies]);

  const invalidateCache = useCallback(() => {
    propertyListingCache[key] = null;
    setData(null);
  }, [key]);

  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  return { data, loading, error, invalidateCache, refetch };
};

// Format price to Indian format
const formatPrice = (price) => {
  if (!price) return 'Price on request';
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
  return `₹${price.toLocaleString()}`;
};

// Format languages to show max 3 languages
const formatLanguages = (languages) => {
  if (!languages) return ['ENG'];
  if (Array.isArray(languages)) {
    return languages.slice(0, 3).map(lang => lang.substring(0, 3).toUpperCase());
  }
  return ['ENG'];
};

// Extract only city name from location
const extractCityOnly = (location) => {
  if (!location) return 'City';

  const locationStr = String(location);

  // Remove state names and other parts, keep only city
  const cityOnly = locationStr
    .replace(/(Gujarat|Maharashtra|Gujrat|Mharat|MH|GJ)/gi, '')
    .replace(/,\s*(India|IN)/gi, '')
    .replace(/,,/g, ',')
    .replace(/,$/, '')
    .trim();

  return cityOnly || 'City';
};

// Enhanced image URL handler
const getSafeImageUrl = (imageUrl, type = 'property') => {
  if (!imageUrl || imageUrl === 'null' || imageUrl === 'undefined') {
    return "https://via.placeholder.com/120x80/f0f0f0/666666?text=No+Image";
  }

  let imgStr = String(imageUrl).trim();

  // Define possible base URLs to check for duplicates
  const baseUrls = [
    'http://192.168.29.176:5000',
    'http://localhost:5000',
    process.env.REACT_APP_UPLOADS_URL_LAN,
    process.env.REACT_APP_UPLOADS_URL_LOCAL
  ].filter(Boolean);

  // Check if image already contains any base URL
  for (const baseUrl of baseUrls) {
    if (baseUrl && imgStr.includes(baseUrl)) {
      return imgStr;
    }
  }

  // If it's already a full URL from another source, return as is
  if (imgStr.startsWith('http://') || imgStr.startsWith('https://')) {
    return imgStr;
  }

  // Clean the path - remove any leading slashes
  imgStr = imgStr.replace(/^\/+/, '');

  // Use environment variable with fallback
  const baseUrl = process.env.REACT_APP_UPLOADS_URL_LAN || 'http://192.168.29.176:5000';

  // Handle different path formats
  if (imgStr.startsWith('uploads/')) {
    return `${baseUrl}/${imgStr}`;
  } else {
    return `${baseUrl}/uploads/${imgStr}`;
  }
};

const PropertyListings = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [postVisible, setPostVisible] = useState(false);
  const [agentModalVisible, setAgentModalVisible] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    propertyType: [],
    priceRange: [0, 10000000000],
    bedrooms: [],
    furnished: [],
    bathrooms: [],
    constructionStatus: [],
    listingType: [],
    areaRange: [0, 10000],
    amenities: []
  });
  
  // Initial filter state for reset functionality
  const initialFilters = useRef({
    propertyType: [],
    priceRange: [0, 10000000000],
    bedrooms: [],
    furnished: [],
    bathrooms: [],
    constructionStatus: [],
    listingType: [],
    areaRange: [0, 10000],
    amenities: []
  }).current;

  // Get user's location for search bar placeholder
  const [userLocation, setUserLocation] = useState(propertyListingCache.city || 'Detecting...');
  const [userCity, setUserCity] = useState(propertyListingCache.city || '');

  // Define fetch functions first
  const fetchProperties = useCallback(async () => {
    try {
      const result = await getProperties();
      
      if (result.success) {
        let allProperties = [];
        // Handle both response structures: { data: [...] } and [...]
        if (Array.isArray(result.data)) {
          allProperties = result.data;
        } else if (result.data?.data && Array.isArray(result.data.data)) {
          allProperties = result.data.data;
        }
        
        console.log('Total properties fetched:', allProperties.length);
        
        // Filter only approved properties initially
        const approvedOnly = allProperties.filter(p => 
          p.status === "approved" || p.isApproved === true
        );
        
        console.log('Approved properties:', approvedOnly.length);
        
        // Enhanced properties data
        const enhancedProperties = approvedOnly.map(property => {
          const price = property.price || property.expectedPrice;
          const bedrooms = property.bedrooms || property.bhk || '2';
          const location = extractCityOnly([property.locality, property.city].filter(Boolean).join(', '));

          let imageUrl = null;
          if (property.images && Array.isArray(property.images) && property.images.length > 0) {
            imageUrl = getSafeImageUrl(property.images[0], 'property');
          } else if (property.image) {
            imageUrl = getSafeImageUrl(property.image, 'property');
          }

          // Determine which single area to show (priority: carpet > buildup > superbuildup)
          const primaryArea = property.carpetArea || property.builtUpArea || property.superBuiltUpArea;
          const primaryAreaLabel = property.carpetArea ? 'carpetArea' : property.builtUpArea ? 'builtUpArea' : property.superBuiltUpArea ? 'superBuiltUpArea' : null;
          
          return {
            ...property,
            id: property._id || property.id,
            bhk: `${bedrooms}`,
            area: primaryArea ? `${primaryArea} sq.ft` : '1000 sq.ft',
            // Only set the primary area, others undefined to avoid showing 0 values
            carpetArea: primaryAreaLabel === 'carpetArea' ? property.carpetArea : undefined,
            builtUpArea: primaryAreaLabel === 'builtUpArea' ? property.builtUpArea : undefined,
            superBuiltUpArea: primaryAreaLabel === 'superBuiltUpArea' ? property.superBuiltUpArea : undefined,
            location: location,
            image: imageUrl,
            formattedPrice: formatPrice(price),
            listingType: property.listingType || property.type || 'Sale',
            hasImage: !!imageUrl,
            title: property.title || property.propertyType || 'Property'
          };
        });

        return enhancedProperties;
      } else {
        console.error('Failed to fetch properties:', result.error);
        return [];
      }
    } catch (err) {
      console.error('Network error occurred:', err);
      return [];
    }
  }, []);

  const fetchAgents = useCallback(async () => {
    try {
      const result = await getAgents();
      
      if (result.success) {
        const allAgents = result.data?.data || result.data || [];
        
        // Filter ONLY approved agents
        const approvedAgents = allAgents.filter(agent => 
          agent.status === "approved" || agent.isApproved === true
        );
        
        // Enhanced agents data
        const enhancedAgents = approvedAgents.map(agent => {
          const safeImage = getSafeImageUrl(agent.image, 'agent');
          
          return {
            ...agent,
            _id: agent._id || agent.id,
            agentName: agent.agentName || agent.name || 'Agent',
            firmName: agent.firmName || 'Independent Agent',
            operatingCity: agent.operatingCity || 'City not specified',
            operatingAreas: formatLanguages(agent.operatingAreas),
            image: safeImage,
            status: agent.status || 'approved'
          };
        });

        return {
          all: allAgents,
          approved: enhancedAgents
        };
      } else {
        console.error('Failed to fetch agents:', result.error);
        return { all: [], approved: [] };
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      return { all: [], approved: [] };
    }
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        const res = await getProfile();
        if (res.success) {
          return res.data.user;
        }
      }
      return null;
    } catch (error) {
      console.log('Error fetching user profile:', error);
      return null;
    }
  }, []);

  const fetchAdvertisements = useCallback(async () => {
    try {
      console.log("📡 Fetching ads with pageKey: property-listing");
      const response = await advertisementService.getAllAdvertisements("property-listing");
      console.log('=== Advertisements API Response ===', response.data);
      
      if (response.data.success) {
        const adsByPosition = {};
        const totalAds = response.data.data ? response.data.data.length : 0;
        console.log(`📊 Total ads received: ${totalAds}`);
        
        response.data.data.forEach(ad => {
          console.log(`Processing ad position ${ad.position}:`, ad);
          if (!adsByPosition[ad.position]) {
            adsByPosition[ad.position] = [];
          }
          adsByPosition[ad.position].push(ad);
        });
        console.log('✅ Ads grouped by position:', adsByPosition);
        console.log('✅ Available positions:', Object.keys(adsByPosition));
        return adsByPosition;
      }
      console.log('❌ API response not successful:', response.data);
      return {};
    } catch (error) {
      console.error("❌ Error fetching advertisements:", error);
      Toast.show("Failed to load advertisements");
      return {};
    }
  }, []);



  // Now use the cached data hooks AFTER defining fetch functions
  const { data: propertiesData, loading: propertiesLoading, invalidateCache: invalidateProperties, refetch: refetchProperties } = useCachedData('properties', fetchProperties);
  const { data: agentsData, loading: agentsLoading, invalidateCache: invalidateAgents, refetch: refetchAgents } = useCachedData('agents', fetchAgents);
  const { data: currentUser, loading: userLoading, refetch: refetchUser } = useCachedData('profile', fetchCurrentUser);
  const { data: advertisements, loading: adLoading, invalidateCache: invalidateAds, refetch: refetchAds } = useCachedData('advertisements', fetchAdvertisements);

  // Handle pull to refresh
  const handleRefresh = async () => {
    try {
      await Promise.all([
        refetchProperties(),
        refetchAgents(),
        refetchUser(),
        refetchAds()
      ]);
      Toast.show({
        content: 'Refreshed successfully',
        icon: 'success',
      });
    } catch (error) {
      console.error(error);
      Toast.show({
        content: 'Refresh failed',
        icon: 'fail',
      });
    }
  };

  // Combined loading state
  const loading = propertiesLoading || agentsLoading || userLoading || adLoading;

  // Check if user is admin
  const isAdmin = currentUser?.phone === process.env.REACT_APP_ADMIN_PHONE;

  // Filter options
  const filterOptions = {
    propertyType: [
      { label: 'Apartment', value: 'Apartment' },
      { label: 'Studio', value: 'Studio' },
      { label: 'Independent House', value: 'Independent House' },
      { label: 'Villa', value: 'Villa' },
      { label: 'Plot', value: 'Plot' },
      { label: 'Commercial Office', value: 'Commercial Office' },
      { label: 'Commercial Shop', value: 'Commercial Shop' },
      { label: 'Warehouse', value: 'Warehouse' },
      { label: 'Industrial Land', value: 'Industrial Land' },
      { label: 'Farmhouse', value: 'Farmhouse' }
    ],
    bedrooms: [
      { label: 'Studio', value: 'Studio' },
      { label: '1 BHK', value: '1 BHK' },
      { label: '2 BHK', value: '2 BHK' },
      { label: '3 BHK', value: '3 BHK' },
      { label: '4 BHK', value: '4 BHK' },
      { label: '5 BHK', value: '5 BHK' },
      { label: '6 BHK+', value: '6 BHK+' },
      { label: 'Independent Floor', value: 'Independent Floor' }
    ],
    bathrooms: [
      { label: '1 Bath', value: '1' },
      { label: '2 Bath', value: '2' },
      { label: '3 Bath', value: '3' },
      { label: '4+ Bath', value: '4' }
    ],
    furnished: [
      { label: 'Unfurnished', value: 'Unfurnished' },
      { label: 'Semi-Furnished', value: 'Semi-Furnished' },
      { label: 'Furnished', value: 'Furnished' }
    ],
    constructionStatus: [
      { label: 'Ready to Move', value: 'Ready to Move' },
      { label: 'Under Construction', value: 'Under Construction' },
      { label: 'New', value: 'New' },
      { label: 'Resale', value: 'Resale' }
    ],
    listingType: [
      { label: 'For Sale', value: 'Sale' },
      { label: 'For Rent', value: 'Rent' }
    ]
  };

  // Common amenities
  const commonAmenities = [
    'Lift', 'Power Backup', 'Security', 'Gated Community',
    'Club House', 'Gym', 'Swimming Pool', 'Car Parking',
    'Garden/Park', '24x7 Water Supply', 'Visitor Parking',
    'Children\'s Play Area', 'Jogging Track', 'Indoor Games'
  ];

  // Get user's current location
  const getUserLocation = useCallback(() => {
    if (propertyListingCache.city) {
      setUserLocation(propertyListingCache.city);
      setUserCity(propertyListingCache.city);
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            const data = await response.json();
            const city = data.city || data.locality || 'Your City';
            setUserLocation(city);
            setUserCity(city);
            propertyListingCache.city = city;
          } catch (error) {
            console.error('Error getting location:', error);
            setUserLocation('NA');
            setUserCity('NA');
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          setUserLocation('NA');
          setUserCity('NS');
        }
      );
    } else {
      setUserLocation('NA');
      setUserCity('NS');
    }
  }, []);

  // Filter properties by location
  const filterByLocation = useCallback((propertiesList) => {
    if (!userCity || userCity === 'Detecting...' || userCity === '') {
      return propertiesList;
    }
    
    // Filter properties that match the user's city
    const currentCityProperties = propertiesList.filter(property => {
      const propertyCity = property.city?.toLowerCase();
      const userCityLower = userCity.toLowerCase();
      
      return propertyCity?.includes(userCityLower) || 
             userCityLower.includes(propertyCity) ||
             property.locality?.toLowerCase().includes(userCityLower) ||
             userCityLower.includes(property.locality?.toLowerCase());
    });
    
    return currentCityProperties;
  }, [userCity]);

  // Apply filters to agents based on location
  const applyAgentFilters = useCallback((agentsList = []) => {
    if (userCity && userCity !== 'Detecting...') {
      const locationFilteredAgents = agentsList.filter(agent => 
        agent.operatingCity?.toLowerCase().includes(userCity.toLowerCase()) ||
        agent.operatingAreas?.some(area => 
          area.toLowerCase().includes(userCity.toLowerCase())
        )
      );
      return locationFilteredAgents;
    } else {
      return agentsList;
    }
  }, [userCity]);

  // Enhanced Apply filters function
  const filteredProperties = useMemo(() => {
    if (!propertiesData) return [];

    let filtered = [...propertiesData];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(property =>
        (property.title?.toLowerCase() || '').includes(query) ||
        (property.location?.toLowerCase() || '').includes(query) ||
        (property.bhk?.toLowerCase() || '').includes(query) ||
        (property.listingType?.toLowerCase() || '').includes(query) ||
        (property.formattedPrice?.toLowerCase() || '').includes(query)
      );
    }

    // Apply location filter
    filtered = filterByLocation(filtered);

    // Apply other filters
    if (filters.listingType.length > 0) {
      filtered = filtered.filter(property =>
        filters.listingType.includes(property.listingType)
      );
    }

    if (filters.propertyType.length > 0) {
      filtered = filtered.filter(property =>
        filters.propertyType.includes(property.type || property.propertyType)
      );
    }

    if (filters.priceRange && filters.priceRange.length === 2) {
      const [minPrice, maxPrice] = filters.priceRange;
      filtered = filtered.filter(property => {
        const price = parseFloat(property.price) || 0;
        return price >= minPrice && price <= maxPrice;
      });
    }

    if (filters.bedrooms.length > 0) {
      filtered = filtered.filter(property =>
        filters.bedrooms.includes(property.bhk)
      );
    }

    return filtered;
  }, [propertiesData, searchQuery, filters, filterByLocation]);

  // Filtered agents
  const filteredAgents = useMemo(() => {
    if (!agentsData?.approved) return [];
    return applyAgentFilters(agentsData.approved);
  }, [agentsData, applyAgentFilters]);

  // Format area
  const formatArea = (area) => area ? `${area} sq.ft` : '';

  // Get first available image
  const getPropertyImage = (property) => {
    if (property.image && property.image !== 'null' && property.image !== 'undefined') {
      return property.image;
    }
    return '/default-property.jpg';
  };

  // Get badge color based on listing type
  const getListingTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'sale': return '#ff4d4f';
      case 'rent': return '#1890ff';
      default: return '#52c41a';
    }
  };

  // Handle view details - navigate to property details page
  const handleViewDetails = (property) => {
    if (property._id) {
      navigate(`/PropertyDetails/${property._id}`);
    } else {
      Toast.show('Property ID not found');
    }
  };

  // Handle post property
  const handlePostProperty = () => {
    if (!currentUser) {
      Toast.show('Please login to post property');
      navigate('/login');
      return;
    }
    setPostVisible(true);
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    propertyListingCache.profile = null;
    setMenuVisible(false);
    Toast.show('Logged out successfully');
  };

  // Handle property added successfully
  const handlePropertyAdded = () => {
    invalidateProperties();
    invalidateAgents();
    setPostVisible(false);
    Toast.show('Property posted successfully!');
  };

  // Handle location change
  const handleLocationChange = (value) => {
    setUserLocation(value);
    setUserCity(value);
    propertyListingCache.city = value;
  };

  // Handle view agent details
  const handleViewAgent = (agent) => {
    setSelectedAgent(agent);
    setAgentModalVisible(true);
  };

  // Function to render properties with advertisements after every 9 properties
  const renderPropertiesWithAds = () => {
    if (!filteredProperties.length) return null;

    const items = [];
    let adCounter = 0;

    // Insert ads after every 9 properties
    for (let i = 0; i < filteredProperties.length; i++) {
      // Add property
      items.push(
        <div key={filteredProperties[i]._id} className="property-grid-item">
          <PropertyCard property={filteredProperties[i]} />
        </div>
      );

      // Add advertisement after every 9 properties
      if ((i + 1) % 9 === 0 && i !== filteredProperties.length - 1) {
        adCounter++;
        items.push(
          <div key={`ad-${i}`} className="advertisement-grid-item" style={{ gridColumn: '1 / -1', margin: '16px 0' }}>
            <AdvertisementCard position={adCounter} />
          </div>
        );
      }
    }

    return items;
  };

  // Function to render advertisement card
  const AdvertisementCard = ({ position }) => {
    let ad = null;
    
    if (advertisements && advertisements[position]) {
      ad = advertisements[position][0];
    }
    
    return (
      <div style={{ margin: '16px 0' }}>
        <AdvertisementManager
          advertisements={ad ? [ad] : []}
          onAdUpdate={() => {
            refetchAds();
          }}
          isAdmin={isAdmin}
          positionId={position}
          pageKey="property-listing"
          key={ad?._id || `empty-${position}`}
        />
      </div>
    );
  };

  // Property Card Component
   const PropertyCard = ({ property }) => {
     console.log('PropertyCard rendered with property:', {
       bedrooms: property.bedrooms,
       carpetArea: property.carpetArea,
       bhk: property.bhk,
       area: property.area
     });
     
     return (
     <Card className="property-card grid-card transparent-card">
       <div className="property-card-content">
         <div className="property-image-container">
           <Image 
             src={getPropertyImage(property)} 
             alt={property.title} 
             className="property-image" 
             fallback={
               <div className="image-fallback">
                 <div className="fallback-icon">🏠</div>
               </div>
             } 
           />
           <div className="listing-badge">
             <Badge color={getListingTypeColor(property.listingType)} content={property.listingType} />
           </div>
         </div>

         <div className="property-details">
           <div className="property-price-main">
             {formatPrice(property.price)}
           </div>
           <div className="property-title">
             <Ellipsis content={property.title} row={1} />
           </div>
           <div className="property-location">
             <EnvironmentOutline className="location-icon" />
             <Ellipsis content={[property.city, property.state].filter(Boolean).join(', ')} row={1} />
           </div>
           <div className="property-features">
             <Space wrap>
               {property.bhk && <Tag className="feature-tag" fill="outline">{property.bhk}</Tag>}
             </Space>
           </div>
           {(property.carpetArea || property.builtUpArea || property.superBuiltUpArea) && (
             <div className="property-areas">
               <Space wrap>
                 {property.carpetArea && <Tag className="feature-tag" fill="outline">CA: {property.carpetArea} sq.ft</Tag>}
                 {property.builtUpArea && <Tag className="feature-tag" fill="outline">BUA: {property.builtUpArea} sq.ft</Tag>}
                 {property.superBuiltUpArea && <Tag className="feature-tag" fill="outline">SBUA: {property.superBuiltUpArea} sq.ft</Tag>}
               </Space>
             </div>
           )}
         </div>
         <div className="property-footer">
           <Button 
             color="primary" 
             size="mini" 
             className="view-button" 
             onClick={() => handleViewDetails(property)}
           >
             View Details
           </Button>
         </div>
       </div>
     </Card>
          );
          };

  // Agent Card Component 
  const AgentCard = ({ agent }) => {
    const getAgentImage = (agent) => {
      if (agent.image && agent.image !== 'null' && agent.image !== 'undefined') {
        return agent.image;
      }
      return 'https://via.placeholder.com/120x80/f0f0f0/666666?text=Agent';
    };

    return (
      <div className="property-grid-item" onClick={() => handleViewAgent(agent)}>
        <Card className="property-card grid-card transparent-card agent-card">
          <div className="property-card-content">
            <div className="property-image-container">
              <Image 
                src={getAgentImage(agent)} 
                alt={agent.agentName} 
                className="property-image" 
                fallback={
                  <div className="image-fallback">
                    <div className="fallback-icon">👤</div>
                  </div>
                } 
              />
              <div className="listing-badge">
                <Badge color="#00897b" content="Agent" />
              </div>
              {/* Approved Badge */}
              {(agent.status === "approved" || agent.isApproved === true) && (
                <div className="status-badge approved-badge">
                  <Badge color="success" content="Verified" />
                </div>
              )}
            </div>

            <div className="property-details">
              <div className="property-price-main">
                {agent.firmName || 'Independent Agent'}
              </div>
              <div className="property-title">
                <Ellipsis content={agent.agentName || 'Agent'} row={1} />
              </div>
              <div className="property-location">
                <EnvironmentOutline className="location-icon" />
                <Ellipsis content={agent.operatingCity || 'City not specified'} row={1} />
              </div>
              
              {/* Operating Areas */}
              <div className="agent-languages">
                <Space wrap>
                  {formatLanguages(agent.operatingAreas).map((area, idx) => (
                    <Tag key={idx} className="feature-tag" fill="outline" style={{ fontSize: '10px' }}>
                      {area}
                    </Tag>
                  ))}
                </Space>
              </div>

              {/* Experience and Deals */}
              <div className="agent-features">
                <Space wrap>
                  {agent.operatingSince && (
                    <Tag className="feature-tag" fill="outline" style={{ fontSize: '10px' }}>
                      Exp: {new Date().getFullYear() - agent.operatingSince} Yrs
                    </Tag>
                  )}
                  {agent.dealsIn && agent.dealsIn.length > 0 && (
                    <Tag className="feature-tag" fill="outline" style={{ fontSize: '10px' }}>
                      {agent.dealsIn[0]}
                    </Tag>
                  )}
                </Space>
              </div>

              <div className="property-footer">
                <Button 
                  color="primary" 
                  size="mini" 
                  className="view-button" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewAgent(agent);
                  }}
                >
                  Contact
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  // Enhanced Filter Modal Component
  const FilterModal = () => {
    const [localFilters, setLocalFilters] = useState(filters);
    const modalContentRef = useRef(null);

    // Sync local state when modal opens or parent filters change externally (rarely)
    useEffect(() => {
      setLocalFilters(filters);
    }, [filters, filterVisible]);
    
    // Scroll to top when modal opens
    useEffect(() => {
        if (filterVisible && modalContentRef.current) {
            modalContentRef.current.scrollTop = 0;
        }
    }, [filterVisible]);

    // Handle filter changes without page refresh
    const handleFilterChange = (filterType, value) => {
      // Update local state only
      setLocalFilters(prev => ({ 
        ...prev, 
        [filterType]: value 
      }));
    };

    // Handle amenity toggle without refresh
    const handleAmenityToggle = (amenity) => {
      const updatedAmenities = localFilters.amenities?.includes(amenity)
        ? localFilters.amenities.filter(a => a !== amenity)
        : [...(localFilters.amenities || []), amenity];
      
      // Update local state only
      setLocalFilters(prev => ({ 
        ...prev, 
        amenities: updatedAmenities 
      }));
    };

    // Reset filters without closing modal
    const handleResetFilters = () => {
      setLocalFilters(initialFilters);
      setFilters(initialFilters);
      setFilterVisible(false);
      Toast.show('Filters reset successfully!');
    };

    // Apply filters and close modal
    const handleApplyFilters = () => {
      setFilters(localFilters); 
      setFilterVisible(false);
      Toast.show('Filters applied successfully!');
    };

    return (
      <Modal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        closeOnMaskClick
        showCloseButton={false}
        bodyStyle={{
          height: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px 16px 0 0',
          padding: '0'
        }}
        content={
          <div
            className="filter-modal-content mobile-filter-content"
            onClick={(e) => e.stopPropagation()}
            ref={modalContentRef}
          >
            {/* Header - Fixed */}
            <div className="filter-modal-header">
              <span className="filter-modal-title">Filters</span>
              <button
                className="close-filter-btn"
                onClick={() => setFilterVisible(false)}
              >
                <CloseOutline />
              </button>
            </div>

            {/* Scrollable content */}
            <div 
              className="filter-scroll-content"
              style={{ 
                flex: 1, 
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {/* Listing Type */}
              <div className="filter-section">
                <h4>Listing Type</h4>
                <Selector
                  options={filterOptions.listingType}
                  value={localFilters.listingType}
                  onChange={(val) => handleFilterChange('listingType', val)}
                  multiple
                  columns={2}
                />
              </div>

              {/* Property Type */}
              <div className="filter-section">
                <h4>Property Type</h4>
                <Selector
                  options={filterOptions.propertyType}
                  value={localFilters.propertyType}
                  onChange={(val) => handleFilterChange('propertyType', val)}
                  multiple
                  columns={2}
                />
              </div>

              {/* Price Range */}
              <div className="filter-section">
                <h4>Price Range</h4>
                <div className="price-range-display mobile-price-display">
                  ₹{localFilters.priceRange[0].toLocaleString()} - ₹{localFilters.priceRange[1].toLocaleString()}
                </div>
                <Slider
                  range
                  min={0}
                  max={100000000}
                  step={100000}
                  value={localFilters.priceRange}
                  onChange={(value) => handleFilterChange('priceRange', value)}
                />
                <div className="price-range-labels mobile-range-labels">
                  <span>₹0</span>
                  <span>₹10Cr</span>
                </div>
              </div>

              {/* Area Range */}
              <div className="filter-section">
                <h4>Area Range (sq.ft)</h4>
                <div className="area-range-display mobile-price-display">
                  {localFilters.areaRange[0]} - {localFilters.areaRange[1]} sq.ft
                </div>
                <Slider
                  range
                  min={0}
                  max={10000}
                  step={100}
                  value={localFilters.areaRange}
                  onChange={(value) => handleFilterChange('areaRange', value)}
                />
                <div className="area-range-labels mobile-range-labels">
                  <span>0 sq.ft</span>
                  <span>10,000 sq.ft</span>
                </div>
              </div>

              {/* Bedrooms */}
              <div className="filter-section">
                <h4>Bedrooms</h4>
                <Selector
                  options={filterOptions.bedrooms}
                  value={localFilters.bedrooms}
                  onChange={(val) => handleFilterChange('bedrooms', val)}
                  multiple
                  columns={3}
                />
              </div>

              {/* Furnishing */}
              <div className="filter-section">
                <h4>Furnishing</h4>
                <Selector
                  options={filterOptions.furnished}
                  value={localFilters.furnished}
                  onChange={(val) => handleFilterChange('furnished', val)}
                  multiple
                  columns={2}
                />
              </div>

              {/* Construction Status */}
              <div className="filter-section">
                <h4>Construction Status</h4>
                <Selector
                  options={filterOptions.constructionStatus}
                  value={localFilters.constructionStatus}
                  onChange={(val) => handleFilterChange('constructionStatus', val)}
                  multiple
                  columns={2}
                />
              </div>

              {/* Bathrooms */}
              <div className="filter-section">
                <h4>Bathrooms</h4>
                <Selector
                  options={filterOptions.bathrooms}
                  value={localFilters.bathrooms}
                  onChange={(val) => handleFilterChange('bathrooms', val)}
                  multiple
                  columns={2}
                />
              </div>

              {/* Amenities */}
              <div className="filter-section">
                <h4>Amenities</h4>
                <div className="amenities-chips-container mobile-amenities">
                  {commonAmenities.map((amenity) => (
                    <div
                      key={amenity}
                      className={`amenity-chip mobile-amenity-chip ${
                        localFilters.amenities?.includes(amenity) ? 'active' : ''
                      }`}
                      onClick={() => handleAmenityToggle(amenity)}
                    >
                      <span className="amenity-chip-icon">✓</span>
                      {amenity}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Fixed bottom buttons */}
            <div className="filter-actions mobile-filter-actions">
              <Button
                className="reset-button mobile-reset-btn"
                onClick={handleResetFilters}
              >
                Reset All
              </Button>
              <Button
                className="apply-button mobile-apply-btn"
                color="primary"
                onClick={handleApplyFilters}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        }
      />
    );
  };
  
  // Menu Popup Component
  const MenuPopup = () => (
    <Popup visible={menuVisible} onMaskClick={() => setMenuVisible(false)} position="right" bodyStyle={{ width: '80vw', height: '100vh', borderTopLeftRadius: '20px', borderBottomLeftRadius: '20px' }}>
      <div className="menu-popup">
        <div className="menu-header">
          <div className="menu-user-info">
            <div className="user-avatar">
              <UserOutline />
            </div>
            <div className="user-details">
              <h3>{currentUser?.name || 'Welcome!'}</h3>
              <p>Explore properties in {userLocation}</p>
            </div>
          </div>
          <Button fill="none" size="small" onClick={() => setMenuVisible(false)} className="close-menu-btn">
            <CloseOutline />
          </Button>
        </div>

        <List className="menu-list">
          {[
            { icon: <UserOutline />, label: 'My Profile', action: () => navigate('/profile') },
            { icon: <BellOutline />, label: 'Notifications', action: () => Toast.show('Notifications clicked') },
            { icon: <HeartOutline />, label: 'Favorites', action: () => navigate('/favorites') },
            { icon: <UserOutline />, label: 'My Properties', action: () => navigate('/my-properties') },
            { icon: <TeamOutline />, label: 'Find Agents', action: () => navigate('/consultants') },
            { icon: <SetOutline />, label: 'Settings', action: () => Toast.show('Settings clicked') },
            { icon: <InformationCircleOutline />, label: 'About Us', action: () => Toast.show('About Us clicked') }
          ].map((item, index) => (
            <List.Item 
              key={index} 
              prefix={item.icon} 
              onClick={() => { 
                setMenuVisible(false); 
                item.action(); 
              }}
            >
              {item.label}
            </List.Item>
          ))}
        </List>

        <div className="menu-footer">
          {currentUser ? (
            <Button color="primary" fill="solid" size="large" className="logout-btn" onClick={handleLogout}>
              Delete Account 
            </Button>
          ) : (
            <Button color="primary" fill="solid" size="large" className="login-btn" onClick={() => navigate('/login')}>
              Login
            </Button>
          )}
        </div>
      </div>
    </Popup>
  );

  // Agent Info Modal Component
  const AgentInfoModal = () => {
    if (!selectedAgent) return null;

    const getAgentImage = (agent) => {
      if (agent.image && agent.image !== 'null' && agent.image !== 'undefined') {
        return agent.image;
      }
      return 'https://via.placeholder.com/150/f0f0f0/666666?text=Agent';
    };

    return (
      <Modal
        visible={agentModalVisible}
        onClose={() => setAgentModalVisible(false)}
        closeOnMaskClick
        showCloseButton
        title="Agent Details"
        bodyStyle={{ 
          padding: '0',
          maxHeight: '85vh',
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}
        content={
          <div style={{ width: '100%', minHeight: '300px' }}>
            {/* Agent Header Image */}
            <div style={{ position: 'relative', backgroundColor: '#f5f5f5' }}>
              <Image 
                src={getAgentImage(selectedAgent)} 
                alt={selectedAgent.agentName || 'Agent'} 
                style={{ width: '100%', height: '200px', borderRadius: '0', objectFit: 'cover' }}
                fallback={
                  <div style={{ width: '100%', height: '200px', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: '48px' }}>👤</div>
                  </div>
                }
              />
              <div style={{ 
                position: 'absolute', 
                bottom: '-40px', 
                left: '20px',
                width: '90px',
                height: '60px',
                borderRadius: '50%',
                border: '4px solid white',
                overflow: 'hidden',
                backgroundColor: 'white'
              }}>
                <Image 
                  src={getAgentImage(selectedAgent)} 
                  alt={selectedAgent.agentName || 'Agent'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  fallback={
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                      👤
                    </div>
                  }
                />
              </div>
            </div>

            {/* Agent Details Content */}
            <div style={{ padding: '50px 20px 20px 20px' }}>
              <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: '600', color: '#000' }}>
                {selectedAgent.agentName || selectedAgent.name || 'Agent Name'}
              </h2>
              <p style={{ color: '#666', margin: '0 0 16px', fontSize: '14px' }}>
                {selectedAgent.firmName || 'Independent Agent'}
              </p>

              {/* Agent Information List */}
              <List style={{ marginBottom: '16px', backgroundColor: 'transparent' }}>
                {/* Phone */}
                {selectedAgent.phone && (
                  <List.Item 
                    prefix={<PhoneFill style={{ color: '#00897b', fontSize: '18px' }} />}
                  >
                    <div>
                      <div style={{ fontSize: '12px', color: '#999' }}>Phone</div>
                      <div style={{ fontWeight: '600', color: '#000', fontSize: '14px' }}>
                        {selectedAgent.phone}
                      </div>
                    </div>
                  </List.Item>
                )}

                {/* Email */}
                {selectedAgent.email && (
                  <List.Item 
                    prefix={<MailFill style={{ color: '#00897b', fontSize: '18px' }} />}
                  >
                    <div>
                      <div style={{ fontSize: '12px', color: '#999' }}>Email</div>
                      <div style={{ fontWeight: '600', color: '#000', fontSize: '14px' }}>
                        {selectedAgent.email}
                      </div>
                    </div>
                  </List.Item>
                )}

                {/* Operating City */}
                {selectedAgent.operatingCity && (
                  <List.Item 
                    prefix={<EnvironmentOutline style={{ color: '#00897b', fontSize: '18px' }} />}
                  >
                    <div>
                      <div style={{ fontSize: '12px', color: '#999' }}>Operating City</div>
                      <div style={{ fontWeight: '600', color: '#000', fontSize: '14px' }}>
                        {selectedAgent.operatingCity}
                      </div>
                    </div>
                  </List.Item>
                )}

                {/* Experience */}
                {selectedAgent.operatingSince && (
                  <List.Item 
                    prefix={<StarOutline style={{ color: '#00897b', fontSize: '18px' }} />}
                  >
                    <div>
                      <div style={{ fontSize: '12px', color: '#999' }}>Experience</div>
                      <div style={{ fontWeight: '600', color: '#000', fontSize: '14px' }}>
                        {new Date().getFullYear() - parseInt(selectedAgent.operatingSince)} Years
                      </div>
                    </div>
                  </List.Item>
                )}

                {/* Team Members */}
                {selectedAgent.teamMembers && (
                  <List.Item 
                    prefix={<TeamOutline style={{ color: '#00897b', fontSize: '18px' }} />}
                  >
                    <div>
                      <div style={{ fontSize: '12px', color: '#999' }}>Team Members</div>
                      <div style={{ fontWeight: '600', color: '#000', fontSize: '14px' }}>
                        {selectedAgent.teamMembers}
                      </div>
                    </div>
                  </List.Item>
                )}
              </List>

              {/* Specializes In */}
              {selectedAgent.dealsIn && selectedAgent.dealsIn.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontWeight: '600', marginBottom: '8px', color: '#000', fontSize: '14px' }}>
                    Specializes In:
                  </p>
                  <Space wrap>
                    {selectedAgent.dealsIn.map((deal, idx) => (
                      <Tag key={idx} color="primary" fill="outline">{deal}</Tag>
                    ))}
                  </Space>
                </div>
              )}

              {/* Operating Areas */}
              {selectedAgent.operatingAreas && selectedAgent.operatingAreas.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontWeight: '600', marginBottom: '8px', color: '#000', fontSize: '14px' }}>
                    Operating Areas:
                  </p>
                  <Space wrap>
                    {selectedAgent.operatingAreas.map((area, idx) => (
                      <Tag key={idx} color="default" fill="outline">{area}</Tag>
                    ))}
                  </Space>
                </div>
              )}

              {/* About Agent */}
              {selectedAgent.aboutAgent && (
                <div style={{ 
                  backgroundColor: '#f9f9f9', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  marginBottom: '16px',
                  borderLeft: '4px solid #00897b'
                }}>
                  <p style={{ fontWeight: '600', marginBottom: '8px', color: '#000', fontSize: '14px' }}>
                    About:
                  </p>
                  <p style={{ margin: '0', color: '#555', fontSize: '13px', lineHeight: '1.6' }}>
                    {selectedAgent.aboutAgent}
                  </p>
                </div>
              )}

              {/* Address */}
              {(selectedAgent.address || selectedAgent.addressLine1 || selectedAgent.city) && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontWeight: '600', marginBottom: '8px', color: '#000', fontSize: '14px' }}>
                    Address:
                  </p>
                  <p style={{ margin: '0', color: '#555', fontSize: '13px', lineHeight: '1.5' }}>
                    {selectedAgent.address || 
                     [selectedAgent.addressLine1, selectedAgent.addressLine2, selectedAgent.city, selectedAgent.state]
                       .filter(Boolean).join(', ') || 'N/A'}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '24px', marginBottom: '16px' }}>
                <Button 
                  color="primary" 
                  fill="solid"
                  block
                  style={{ flex: 1 }}
                  onClick={() => {
                    Toast.show("pay for contact")
                  }}
                >
                  <PhoneFill style={{ marginRight: '6px' }} />
                  Call
                </Button>
                <Button 
                  color="primary" 
                  fill="outline"
                  block
                  style={{ flex: 1 }}
                  onClick={() => {
                    Toast.show('Pay for Whatsapp contact')
                  }}
                >
                  <MessageOutline style={{ marginRight: '6px' }} />
                  WhatsApp
                </Button>
              </div>

              {/* Status Badge */}
              {selectedAgent.status && (
                <div style={{ textAlign: 'center', marginBottom: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
                  <Badge 
                    color={selectedAgent.status === 'approved' || selectedAgent.status === 'Approved' ? 'success' : selectedAgent.status === 'rejected' ? 'danger' : 'warning'} 
                    content={selectedAgent.status?.charAt(0).toUpperCase() + selectedAgent.status?.slice(1)}
                  />
                </div>
              )}
            </div>
          </div>
        }
      />
    );
  };



  // Determine if we should show agents prominently (when no properties)
  const showAgentsProminently = filteredProperties.length === 0 && filteredAgents.length > 0;

  // Get approved properties count for display
  const approvedPropertiesCount = propertiesData ? propertiesData.length : 0;

  useEffect(() => {
    // Force refetch all data - bypass cache completely
    console.log("🔄 Force refetching all data");
    propertyListingCache.properties = null;
    propertyListingCache.agents = null;
    propertyListingCache.advertisements = null;
    propertyListingCache.profile = null;
    propertyListingCache.timestamp = null;
    
    // Force API calls
    refetchProperties(true);
    refetchAgents(true);
    refetchAds(true);
    refetchUser(true);
    
    getUserLocation();
  }, [getUserLocation, refetchProperties, refetchAgents, refetchAds, refetchUser]);

  if (loading) {
    return (
      <div className="property-listings-container">
        {/* Background Image - Same as home.jsx */}
        <div className="property-background-image"></div>
        
        {/* Content Overlay - Same as home.jsx */}
        <div className="content-overlay">
          {/* HeaderWithSearch component */}
          <HeaderWithSearch
            searchValue={searchQuery}
            setSearchValue={setSearchQuery}
            city={userLocation}
            setCity={handleLocationChange}
          />
          
          <div className="loading-container">
            <SpinLoading color="primary" style={{ fontSize: 48 }} />
            <div style={{ marginTop: 16, color: 'white', fontSize: 14 }}>
              Loading properties in {userCity}...
            </div>
          </div>
        </div>
        
        <style jsx>{`
          .property-listings-container {
            position: relative;
            min-height: 100vh;
          }
          
          .property-background-image {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.7)), url('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80');
            background-size: cover;
            background-position: center;
            background-attachment: fixed;
            z-index: 0;
          }
          
          .content-overlay {
            position: relative;
            z-index: 1;
            padding-bottom: 80px;
            min-height: 100vh;
          }
          
          .loading-container {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 60vh;
            padding-top: 20px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="property-listings-container">
      {/* Background Image - Same as home.jsx */}
      <div className="property-background-image"></div>
      
      {/* Content Overlay - Same as home.jsx */}
      <div className="content-overlay">
        <PullToRefresh onRefresh={handleRefresh}>
        {/* HeaderWithSearch component */}
        <HeaderWithSearch
          searchValue={searchQuery}
          setSearchValue={setSearchQuery}
          city={userLocation}
          setCity={handleLocationChange}
        />

        {/* Filter and Refresh Buttons */}
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '8px 16px',
            marginBottom: '0px',
            marginTop: '0px'
          }}
        >
          <div className="filter-section-header">
            <Button 
              color="primary" 
              fill="outline" 
              className="filter-button mobile-filter-button" 
              onClick={() => setFilterVisible(true)}
              style={{
                padding: '10px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              <FilterOutline />
              Filter
            </Button>
          </div>
        </div>
      
        {/* Main Content Area */}
        <div className="main-content-area" style={{ marginTop: '0px', paddingTop: '0px' }}>
          
          {/* Show Agents Prominently when NO properties */}
          {showAgentsProminently && (
            <div className="agents-section-prominent" style={{ padding: '16px' }}>
              <div className="section-header-prominent">
                <h3 style={{ color: 'white', marginBottom: '12px', fontSize: '16px', fontWeight: '600', textAlign: 'center' }}>
                  Verified Real Estate Agents in {userCity} ({filteredAgents.length})
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center', fontSize: '14px', margin: 0 }}>
                  No properties found? Connect with local experts!
                </p>
              </div>
              
              {/* Agents Grid */}
              <div className="properties-grid">
                {filteredAgents.slice(0, 6).map((agent) => (
                  <AgentCard key={agent._id} agent={agent} />
                ))}
              </div>

              {/* Advertisement after agents at the end */}
              <div style={{ margin: '16px 0' }}>
                <AdvertisementCard position={8} />
              </div>
              </div>
              )}

              {/* Properties Section - Only show when there are properties */}
          {filteredProperties.length > 0 ? (
            <div className="properties-section" style={{ marginTop: '0px', paddingTop: '0px' }}>
              <div className="properties-grid-container" style={{ marginTop: '0px', paddingTop: '0px' }}>
                {/* Properties with advertisements inserted after every 9 properties */}
                <div className="properties-grid" style={{ marginTop: '0px' }}>
                  {renderPropertiesWithAds()}
                </div>
              </div>
            </div>
          ) : !showAgentsProminently ? (
            /* When no properties and no agents, show empty state */
            <div className="no-properties-section" style={{ padding: '20px 16px', minHeight: '40vh' }}>
              <Empty 
                description={
                  searchQuery 
                    ? "No approved properties match your search" 
                    : approvedPropertiesCount === 0 && propertiesData && propertiesData.length > 0
                      ? "No approved properties available yet" 
                      : `No properties found in ${userCity}`
                } 
                imageStyle={{ width: 128, height: 128 }} 
              />
              {propertiesData && propertiesData.length > 0 && approvedPropertiesCount === 0 && (
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                  <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '10px' }}>
                    Found {propertiesData.length} total properties in system, but none are approved yet.
                  </p>
                </div>
              )}
            </div>
          ) : null}

          {/* Agents Section - Show below properties when there ARE properties */}
          {filteredProperties.length > 0 && filteredAgents.length > 0 && (
            <div className="agents-section" style={{ marginTop: '20px', padding: '16px' }}>
              <div className="section-header">
                <h3 style={{ color: 'white', marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>
                  Verified Agents in {userCity} ({filteredAgents.length})
                </h3>
              </div>
              
              {/* Agents Grid */}
              <div className="properties-grid">
                {filteredAgents.slice(0, 6).map((agent) => (
                  <AgentCard key={agent._id} agent={agent} />
                ))}
              </div>

              {/* Advertisement after agents */}
              <div style={{ margin: '16px 0' }}>
                <AdvertisementCard position={8} />
              </div>
              </div>
              )}

                  </div>
              </PullToRefresh>

        {/* Post Property Floating Button */}
        {currentUser && (
          <div className="floating-action-button" onClick={handlePostProperty}>
            <AddOutline className="fab-icon" />
          </div>
        )}

        {/* Modals and Popups */}
        <FilterModal />
        <MenuPopup />
        <AgentInfoModal />
        <PostProperty 
          visible={postVisible} 
          onClose={() => setPostVisible(false)}
          onSuccess={handlePropertyAdded}
        />
      </div>

      <style jsx>{`
        .property-listings-container {
          position: relative;
          min-height: 100vh;
        }
        
        .property-background-image {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.7)), url('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80');
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
          z-index: 0;
        }
        
        .content-overlay {
          position: relative;
          z-index: 1;
          padding-bottom: 80px;
          min-height: 100vh;
        }
      `}</style>
    </div>
  );
};

export default PropertyListings;