import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from 'react-redux';
import { setConsultants } from '../store/slices/homeSlice';
import {
  Grid,
  Card,
  Tag,
  Button,
  Toast,
  Avatar,
  Badge,
  Space,
  DotLoading,
  Empty,
  Popup,
  List,
  Modal,
  Ellipsis,
  Selector,
  Slider,
  PullToRefresh,
} from "antd-mobile";
import {
  UserOutline,
  MessageOutline,
  EnvironmentOutline,
  StarOutline,
  MoreOutline,
  FilterOutline,
  CloseOutline,
  HeartOutline,
  TeamOutline,
  BellOutline,
  SetOutline,
  InformationCircleOutline,
} from "antd-mobile-icons";
import { useNavigate } from "react-router-dom";
import { getConsultants } from "../services/consultants";
import { getProfile } from "../services/auth";
import HeaderWithSearch from "../components/common/HeaderWithSearch";
// NEW IMPORTS FOR AD MANAGEMENT
import AdvertisementManager from "../components/common/AdvertisementManager";
import { advertisementService } from "../services/advertise";
// END NEW IMPORTS

import { 
  AddOutline,
} from 'antd-mobile-icons';
import AddConsultantModal from "../components/consultantComponent";
import AgentRegistration from "../components/agentComponent";

export default function BookConsultant() {
  const [headerKey, setHeaderKey] = useState(0);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { consultants } = useSelector(state => state.home);
  // const [consultants, setConsultants] = useState([]); // Replaced by Redux
  const [filteredConsultants, setFilteredConsultants] = useState([]);
  const [loading, setLoading] = useState(consultants.length === 0);
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState("Detecting...");
  const [currentUser, setCurrentUser] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedConsultant, setSelectedConsultant] = useState(null);
  const [showConsultantForm, setShowConsultantForm] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    experience: [],
    designation: [],
    expertise: [],
    languages: [],
    price: [0, 5000],
  });

  // NEW: Advertisement states
  const [advertisements, setAdvertisements] = useState([]);
  const [adLoading, setAdLoading] = useState(false);
  
  // Admin Check (Derived state) - role is an ARRAY
  const isAdmin = currentUser?.phone === process.env.REACT_APP_ADMIN_PHONE;
  const isAgent = Array.isArray(currentUser?.role) ? currentUser.role.includes('agent') : currentUser?.role === 'agent';
  const isConsultant = Array.isArray(currentUser?.role) ? currentUser.role.includes('consultant') : currentUser?.role === 'consultant';
  const canUpload = isAgent || isConsultant;  // Show FAB for agent and consultant
  
  // Debug logging
  console.log("🔍 Current User:", currentUser);
  console.log("📋 Role array/value:", currentUser?.role);
  console.log("✅ isAgent:", isAgent, "isConsultant:", isConsultant, "canUpload:", canUpload);

  // FIXED: Image URL resolver
  const getSafeImageUrl = (image) => {
    if (!image || image === 'null' || image === 'undefined') {
      return "https://via.placeholder.com/120x80/f0f0f0/666666?text=No+Image";
    }

    let imgStr = String(image).trim();

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

  const getPlaceholderImage = (width, height) => {
    return `https://via.placeholder.com/${width}x${height}/f0f0f0/666666?text=No+Image`;
  };

  // Experience options
  const experienceOptions = [
    { label: '0-2 years', value: '0-2' },
    { label: '2-5 years', value: '2-5' },
    { label: '5-10 years', value: '5-10' },
    { label: '10+ years', value: '10+' },
  ];

  const designationOptions = [
    { label: "Real Estate Consultant", value: "Real Estate Consultant" },
    { label: "Property Advisor", value: "Property Advisor" },
    { label: "Investment Consultant", value: "Investment Consultant" },
    { label: "Senior Consultant", value: "Senior Consultant" },
    { label: "Junior Consultant", value: "Junior Consultant" },
  ];

  const expertiseOptions = [
    { label: "Market Analysis", value: "Market Analysis" },
    { label: "Negotiation", value: "Negotiation" },
    { label: "Property Management", value: "Property Management" },
    { label: "Customer Service", value: "Customer Service" },
    { label: "Legal Documentation", value: "Legal Documentation" },
  ];

  const languageOptions = [
    { label: "English", value: "English" },
    { label: "Hindi", value: "Hindi" },
    { label: "Gujarati", value: "Gujarati" },
    { label: "Tamil", value: "Tamil" },
    { label: "Marathi", value: "Marathi" },
  ];

  // NEW: Fetch advertisements function
  const fetchAdvertisements = async () => {
    try {
      setAdLoading(true);
      const response = await advertisementService.getAllAdvertisements("book-consultant");
      if (response.data.success) {
        setAdvertisements(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching advertisements:", error);
      Toast.show("Failed to load advertisements");
    } finally {
      setAdLoading(false);
    }
  };

  // Format languages to show max 3 languages
  const formatLanguages = (languages) => {
    if (!languages) return ['ENG'];

    let languageArray = [];

    if (Array.isArray(languages)) {
      languageArray = languages
        .filter(lang => lang && lang.trim().length > 0)
        .map(lang => String(lang).trim());
    } else if (typeof languages === 'string') {
      // Clean the string and split by commas
      const cleanString = languages.replace(/[\[\]"]/g, '').trim();
      languageArray = cleanString.split(',').map(lang => lang.trim()).filter(lang => lang);
    }

    if (languageArray.length === 0) return ['ENG'];

    // Take first 3 languages and show first 3 letters in uppercase
    const formatted = languageArray.slice(0, 3).map(lang => {
      const cleanLang = lang.replace(/[^a-zA-Z]/g, '');
      return cleanLang.substring(0, 3).toUpperCase();
    }).filter(lang => lang.length > 0);

    return formatted;
  };

  // Get first N consultants
  const getFirstNine = (consultantsList) => {
    return consultantsList.slice(0, 9);
  };

  // Get user's location
  const detectLocation = () => {
    setUserLocation("");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            const data = await response.json();
            const city = data.city || data.locality ;
            setUserLocation(city);
          } catch (error) {
            setUserLocation("not found");
          }
        },
        () => setUserLocation("not found ")
      );
    }
  };

  // UPDATED: Fetch consultants with approved data filtering
  const fetchConsultants = async () => {
    try {
      if (consultants.length === 0) setLoading(true);
      const result = await getConsultants();
      console.log("API Response:", result);

      if (result.success) {
        const consultantsData = result.data?.data || result.data || [];
        console.log("Raw consultants data:", consultantsData);

        // ADDED: Filter only approved consultants
        const approvedConsultants = consultantsData.filter(
          consultant => consultant.status === "approved"
        );

        console.log("Approved consultants:", approvedConsultants);

        // Enhanced consultants data with proper field mapping
        const enhancedConsultants = approvedConsultants.map(consultant => {
          const formattedLanguages = formatLanguages(consultant.languages);
          const safeImage = getSafeImageUrl(consultant.image);

          // Determine consultation time based on moneyType
          let consultationTime = 'session';
          if (consultant.moneyType === 'minute') consultationTime = 'min';
          if (consultant.moneyType === 'hour') consultationTime = 'hour';
          if (consultant.moneyType === 'project') consultationTime = 'project';

          const enhanced = {
            ...consultant,
            _id: consultant._id || consultant.id,
            name: consultant.name || 'Consultant',
            designation: consultant.designation || 'Real Estate Consultant',
            type: consultant.designation || 'Real Estate Consultant',
            expertise: consultant.expertise || 'General Consulting',
            languages: formattedLanguages,
            consultationFee: consultant.money || consultant.consultationFee || '500',
            consultationTime: consultationTime,
            experience: consultant.experience || 0,
            location: consultant.city || 'City not specified',
            image: safeImage,
            status: consultant.status || 'approved'
          };

          console.log("Enhanced consultant data:", enhanced);
          return enhanced;
        });

        dispatch(setConsultants(enhancedConsultants));
        applyFiltersAndLocation(enhancedConsultants);
      } else {
        Toast.show(result.error || "Failed to fetch consultants");
      }
    } catch (error) {
      console.error("Error fetching consultants:", error);
      Toast.show("Error loading consultants");
    } finally {
      setLoading(false);
    }
  };

  // Fetch current user
  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (token) {
        const res = await getProfile();
        if (res.success) {
          console.log("✅ User profile loaded:", res.data.user);
          console.log("🔍 User role:", res.data.user?.role);
          setCurrentUser(res.data.user);
        }
      }
    } catch (error) {
      console.log("Error fetching user profile:", error);
    }
  };

  // UPDATED: Optimized filter application with useCallback
  const applyFiltersAndLocation = useCallback((consultantsList = consultants) => {
    let filtered = [...consultantsList];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(consultant =>
        (consultant.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (consultant.expertise?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (consultant.location?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (consultant.designation?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      );
    }

    // Apply experience filter
    if (filters.experience.length > 0) {
      filtered = filtered.filter(consultant => {
        const exp = parseInt(consultant.experience) || 0;
        return filters.experience.some(range => {
          if (range === '0-2') return exp >= 0 && exp <= 2;
          if (range === '2-5') return exp > 2 && exp <= 5;
          if (range === '5-10') return exp > 5 && exp <= 10;
          if (range === '10+') return exp > 10;
          return false;
        });
      });
    }

    // Type of Consultant (designation)
    if (filters.designation.length > 0) {
      filtered = filtered.filter((consultant) =>
        filters.designation.includes(consultant.designation)
      );
    }

    // Expertise filter
    if (filters.expertise.length > 0) {
      filtered = filtered.filter((consultant) =>
        consultant.expertise
          ?.split(",")
          .some((exp) =>
            filters.expertise.includes(exp.trim())
          )
      );
    }

    // Language filter
    if (filters.languages.length > 0) {
      filtered = filtered.filter((consultant) =>
        consultant.languages?.some((lang) =>
          filters.languages.includes(lang)
        )
      );
    }

    // Price filter
    if (filters.price && filters.price.length === 2) {
      const [minPrice, maxPrice] = filters.price;
      filtered = filtered.filter((consultant) => {
        const price = parseFloat(consultant.consultationFee) || 0;
        return price >= minPrice && price <= maxPrice;
      });
    }

    // Sort by location - current city first, then nearby
    if (userLocation && userLocation !== "Detecting...") {
      filtered.sort((a, b) => {
        const aIsCurrentCity = (a.location?.toLowerCase() || '').includes(userLocation.toLowerCase());
        const bIsCurrentCity = (b.location?.toLowerCase() || '').includes(userLocation.toLowerCase());

        if (aIsCurrentCity && !bIsCurrentCity) return -1;
        if (!aIsCurrentCity && bIsCurrentCity) return 1;

        // If both are from current city or both are not, sort by experience (highest first)
        return (b.experience || 0) - (a.experience || 0);
      });
    }

    setFilteredConsultants(filtered);
  }, [searchQuery, filters, userLocation, consultants]);

  // Format experience
  const formatExperience = (exp) => {
    const experience = parseInt(exp) || 0;
    if (!experience) return "0 years";
    return `${experience} ${experience === 1 ? 'year' : 'years'}`;
  };

  // Get consultants in chunks of 9
  const getConsultantChunks = () => {
    const chunks = [];
    const firstNine = getFirstNine(filteredConsultants);
    if (firstNine.length > 0) {
      chunks.push(firstNine);
    }
    return chunks;
  };

  // Consultant Card Component with proper data display
  const ConsultantCard = ({ consultant }) => {
    const [imgSrc, setImgSrc] = useState(consultant.image);
    const [imgError, setImgError] = useState(false);

    const handleImageError = () => {
      if (!imgError) {
        console.warn('Image failed to load:', imgSrc);
        setImgError(true);
        setImgSrc(getPlaceholderImage(120, 80));
      }
    };

    const handleImageLoad = () => {
      console.log('Image loaded successfully:', consultant.name);
    };

    return (
      <Grid.Item key={consultant._id}>
        <Card
          style={{
            background: "rgba(255, 255, 255, 0.19)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "12px",
            overflow: "hidden",
            padding: 0,
            height: '100%'
          }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedConsultant(consultant);
          }}
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}>
            {/* Consultant Image */}
            <div style={{
              width: '100%',
              height: '80px',
              overflow: 'hidden',
              background: '#f5f5f5'
            }}>
              <img
                src={imgSrc}
                alt={consultant.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                onError={handleImageError}
                onLoad={handleImageLoad}
                loading="lazy"
              />
            </div>

            {/* Consultant Info */}
            <div style={{
              padding: '8px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Name */}
              <div style={{
                fontWeight: '600',
                fontSize: '11px',
                color: 'white',
                marginBottom: '2px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {consultant.name}
              </div>

              {/* Designation/Type */}
              <div
                style={{
                  fontSize: "8px",
                  color: "#1677ff",
                  fontWeight: 800,
                  marginBottom: "4px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.3px",
                  textTransform: "capitalize",
                }}
              >
                {consultant.designation || consultant.type}
              </div>

              {/* Location */}
              <div style={{
                fontSize: '8px',
                color: 'rgba(255, 255, 255, 1)',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}>
                <EnvironmentOutline style={{ fontSize: '8px' }} />
                <span style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {consultant.location}
                </span>
              </div>

              {/* Languages - Shows max 3 languages */}
              <div style={{
                display: 'flex',
                gap: '2px',
                marginBottom: '4px',
                flexWrap: 'wrap'
              }}>
                {consultant.languages && consultant.languages.slice(0, 3).map((lang, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '7px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      padding: '1px 3px',
                      borderRadius: '4px'
                    }}
                  >
                    {lang}
                  </span>
                ))}
                {/* Show +X if there are more than 3 languages */}
                {consultant.languages && consultant.languages.length > 3 && (
                  <span
                    style={{
                      fontSize: '7px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 1)',
                      padding: '1px 3px',
                      borderRadius: '4px'
                    }}
                  >
                    +{consultant.languages.length - 3}
                  </span>
                )}
              </div>

              {/* Experience */}
              <div
                style={{
                  fontSize: "9px",
                  fontWeight: "600",
                  marginBottom: "4px",
                }}
              >
                <span style={{ color: "white" }}>Exp:</span>{" "}
                <span style={{ color: "#ff6b00" }}>
                  {consultant.experience || 1} year
                </span>
              </div>

              {/* Fee */}
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: "600",
                  marginBottom: "6px",
                }}
              >
                <span style={{ color: "white" }}>Fee:</span>{" "}
                <span style={{ color: "#ff6b00" }}>
                  ₹{consultant.consultationFee || 500} / {consultant.consultationTime || "session"}
                </span>
              </div>

              {/* View Button */}
              <Button
                size="mini"
                color="primary"
                fill="solid"
                style={{
                  fontSize: '12px',
                  height: '24px',
                  marginTop: 'auto'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setSelectedConsultant(consultant);
                }}
              >
                View 
              </Button>
            </div>
          </div>
        </Card>
      </Grid.Item>
    );
  };

  // Menu Popup Component
  const MenuPopup = () => (
    <Popup
      visible={menuVisible}
      onMaskClick={() => setMenuVisible(false)}
      position="right"
      bodyStyle={{ width: '80vw', height: '100vh' }}
    >
      <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: '#1677ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '20px'
            }}>
              <UserOutline />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px' }}>{currentUser?.name || 'Welcome!'}</h3>
              <p style={{ margin: 0, color: '#666', fontSize: '12px' }}>Find expert consultants</p>
            </div>
          </div>
          <Button 
            fill="none" 
            size="small" 
            onClick={(e) => {
              e.stopPropagation();
              setMenuVisible(false);
            }}
          >
            <CloseOutline />
          </Button>
        </div>

        <List style={{ flex: 1 }}>
          {[
            { icon: <UserOutline />, label: 'My Profile', action: () => navigate('/profile') },
            { icon: <BellOutline />, label: 'Notifications', action: () => Toast.show('Notifications feature coming soon') },
            { icon: <HeartOutline />, label: 'Favorites', action: () => navigate('/favorites') },
            { icon: <TeamOutline />, label: 'My Consultants', action: () => Toast.show('My Consultants feature coming soon') },
            { icon: <SetOutline />, label: 'Settings', action: () => Toast.show('Settings feature coming soon') },
            { icon: <InformationCircleOutline />, label: 'About Us', action: () => Toast.show('About Us feature coming soon') }
          ].map((item, index) => (
            <List.Item
              key={index}
              prefix={item.icon}
              onClick={(e) => {
                e.stopPropagation();
                setMenuVisible(false);
                item.action();
              }}
              style={{ fontSize: '14px' }}
            >
              {item.label}
            </List.Item>
          ))}
        </List>

        <div>
          {currentUser ? (
            <Button
              color="primary"
              fill="solid"
              size="large"
              block
              onClick={(e) => {
                e.stopPropagation();
                localStorage.removeItem('authToken');
                setCurrentUser(null);
                setMenuVisible(false);
                Toast.show('Logged out successfully');
              }}
            >
              Logout
            </Button>
          ) : (
            <Button
              color="primary"
              fill="solid"
              size="large"
              block
              onClick={(e) => {
                e.stopPropagation();
                setMenuVisible(false);
                navigate('/login');
              }}
            >
              Login
            </Button>
          )}
        </div>
      </div>
    </Popup>
  );

  // FIXED: Filter Modal Component with local state to prevent refreshing
 // FIXED: Filter Modal Component with proper scrolling
const FilterModal = () => {
  const [localFilters, setLocalFilters] = useState(filters);

  // Sync local state when modal opens
  useEffect(() => {
    if (filterVisible) {
      setLocalFilters(filters);
    }
  }, [filterVisible, filters]);

  const handleFilterChange = (filterType, value) => {
    setLocalFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleResetFilters = () => {
    setLocalFilters({
      experience: [],
      designation: [],
      expertise: [],
      languages: [],
      price: [0, 5000],
    });
  };

  const handleApplyFilters = () => {
    setFilters(localFilters);
    setFilterVisible(false);
    Toast.show('Filters applied');
  };

  return (
    <Modal
      visible={filterVisible}
      onClose={() => setFilterVisible(false)}
      title="Filter Consultants"
      bodyStyle={{
        maxHeight: "70vh",
        overflowY: "auto",
        padding: "0",
      }}
      content={
        <div 
          style={{ 
            padding: "16px",
          }}
          className="filter-modal-content" // Add class for better targeting
        >
          {/* Experience */}
          <div style={{ marginBottom: "20px" }}>
            <h4 style={{ marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#000" }}>Experience Level</h4>
            <Selector
              options={experienceOptions}
              value={localFilters.experience}
              onChange={(value) => handleFilterChange('experience', value)}
              multiple
            />
          </div>

          {/* Type of Consultant */}
          <div style={{ marginBottom: "20px" }}>
            <h4 style={{ marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#000" }}>Type of Consultant</h4>
            <Selector
              options={designationOptions}
              value={localFilters.designation}
              onChange={(value) => handleFilterChange('designation', value)}
              multiple
            />
          </div>

          {/* Expertise */}
          <div style={{ marginBottom: "20px" }}>
            <h4 style={{ marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#000" }}>Expertise</h4>
            <Selector
              options={expertiseOptions}
              value={localFilters.expertise}
              onChange={(value) => handleFilterChange('expertise', value)}
              multiple
            />
          </div>

          {/* Price Range */}
          <div style={{ marginBottom: "20px" }}>
            <h4 style={{ marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#000" }}>
              Price Range (₹{localFilters.price[0]} - ₹{localFilters.price[1]})
            </h4>
            <div style={{ 
              padding: "16px 8px",
              background: "#f8f9fa",
              borderRadius: "8px",
              border: "1px solid #e9ecef"
            }}>
              <Slider
                range
                min={0}
                max={10000}
                step={100}
                value={localFilters.price}
                onChange={(val) => {
                  console.log("Slider value changed:", val);
                  handleFilterChange('price', val);
                }}
                style={{
                  '--fill-color': '#1677ff',
                  '--track-color': '#e0e0e0',
                  '--track-height': '6px',
                  '--thumb-size': '24px',
                }}
              />
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                marginTop: "12px",
                fontSize: "12px",
                color: "#666"
              }}>
                <span>₹0</span>
                <span>₹5,000</span>
                <span>₹10,000</span>
              </div>
            </div>
          </div>

          {/* Languages */}
          <div style={{ marginBottom: "20px" }}>
            <h4 style={{ marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#000" }}>Languages</h4>
            <Selector
              options={languageOptions}
              value={localFilters.languages}
              onChange={(value) => handleFilterChange('languages', value)}
              multiple
            />
          </div>

          {/* Action Buttons */}
          <div style={{ 
            display: "flex", 
            gap: "8px", 
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "1px solid #f0f0f0"
          }}>
            <Button 
              color="default" 
              onClick={handleResetFilters}
              style={{ flex: 1 }}
            >
              Reset
            </Button>
            <Button 
              color="primary" 
              onClick={handleApplyFilters}
              style={{ flex: 1 }}
            >
              Apply
            </Button>
          </div>
        </div>
      }
      closeOnAction
      onAction={() => setFilterVisible(false)}
      actions={[
        {
          key: 'close',
          text: 'Close',
        },
      ]}
    />
  );
};

  // Consultant Detail Modal
  const ConsultantModal = () => (
    <Modal
      visible={!!selectedConsultant}
      onClose={() => setSelectedConsultant(null)}
      content={
        selectedConsultant && (
          <div className="consultant-modal" style={{ position: "relative" }}>
            {/* Cancel (×) button in top-right corner */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedConsultant(null);
              }}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "none",
                border: "none",
                fontSize: "22px",
                cursor: "pointer",
                zIndex: 1000
              }}
            >
              ×
            </button>

            <div style={{ textAlign: "center", paddingTop: "25px" }}>
              <img
                src={
                  selectedConsultant.photo
                    ? selectedConsultant.photo
                    : selectedConsultant.image
                    ? selectedConsultant.image
                    : selectedConsultant.imageUrl
                    ? selectedConsultant.imageUrl
                    : "https://via.placeholder.com/100?text=No+Image"
                }
                alt={selectedConsultant.name}
                style={{
                  width: "90px",
                  height: "90px",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />

              <h3 style={{ textTransform: "capitalize", marginTop: "10px" }}>
                {selectedConsultant.name}
              </h3>
              <p style={{ color: "gray", marginBottom: "10px" }}>
                {selectedConsultant.designation}
              </p>

              {/* Expertise */}
              <div>
                <b>Expertise</b>
                <div style={{ marginTop: "5px", marginBottom: "10px" }}>
                  {Array.isArray(selectedConsultant.expertise)
                    ? selectedConsultant.expertise.map((exp, i) => (
                        <span
                          key={i}
                          style={{
                            display: "inline-block",
                            border: "1px solid #007bff",
                            color: "#007bff",
                            borderRadius: "4px",
                            padding: "2px 6px",
                            margin: "2px",
                            fontSize: "12px",
                          }}
                        >
                          {exp}
                        </span>
                      ))
                    : typeof selectedConsultant.expertise === "string"
                    ? selectedConsultant.expertise
                        .split(",")
                        .map((exp, i) => (
                          <span
                            key={i}
                            style={{
                              display: "inline-block",
                              border: "1px solid #007bff",
                              color: "#007bff",
                              borderRadius: "4px",
                              padding: "2px 6px",
                              margin: "2px",
                              fontSize: "12px",
                            }}
                          >
                            {exp.trim()}
                          </span>
                        ))
                    : "N/A"}
                </div>
              </div>

              {/* Details */}
              <div style={{ textAlign: "left", margin: "10px 0" }}>
                <p>📍 {selectedConsultant.location}</p>
                <p>⭐ Experience: {selectedConsultant.experience}</p>
                <p>
                  💰 Fee: ₹{selectedConsultant.consultationFee || selectedConsultant.fee} /{" "}
                  {selectedConsultant.consultationTime || selectedConsultant.feeType || "hour"}
                </p>
                <p>
                  🗣 Languages:{" "}
                  {selectedConsultant.languages?.join(", ") || "N/A"}
                </p>
              </div>

              {/* Submit Button */}
              <button
                style={{
                  background: "#007bff",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 25px",
                  fontSize: "16px",
                  cursor: "pointer",
                  marginTop: "10px",
                  width: "100%",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  Toast.show({
                    icon: "success",
                    content: "Consultation booked successfully!",
                  });
                  setSelectedConsultant(null);
                }}
              >
                Submit
              </button>
            </div>
          </div>
        )
      }
    />
  );

  // Handle Pull to Refresh
  const handleRefresh = async () => {
    try {
      // Trigger location detection without awaiting
      detectLocation();
      setHeaderKey(prev => prev + 1);
      
      await Promise.all([
        fetchConsultants(),
        fetchCurrentUser(),
        fetchAdvertisements()
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

  // FIXED: Improved scroll prevention
  

  useEffect(() => {
    detectLocation();
    fetchConsultants();
    fetchCurrentUser();
    fetchAdvertisements(); // Fetch dynamic advertisements
  }, []);

  useEffect(() => {
    applyFiltersAndLocation();
  }, [applyFiltersAndLocation]);

  const consultantChunks = getConsultantChunks();

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      backgroundImage: 'url("https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      {/* Dark Overlay */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 0
      }}></div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <PullToRefresh 
          onRefresh={handleRefresh}
          pullingText="Pull to refresh"
          canReleaseText="Release to refresh"
          refreshingText="Refreshing..."
          completeText="Refresh complete"
          headerHeight={50}
          completeDelay={500}
        >
        <HeaderWithSearch
          key={headerKey}
          searchValue={searchQuery}
          setSearchValue={setSearchQuery}
          city={userLocation}
          setCity={setUserLocation}
          profile={currentUser}
        />
       

        {/* Filter info and count */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          padding: '8px 12px',
          borderBottom: '1px solid rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#666' }}>
              {filteredConsultants.length} consultants found
            </span>
            <Button
              color="primary"
              fill="outline"
              size="mini"
              onClick={() => setFilterVisible(true)}
            >
              <FilterOutline style={{ fontSize: '12px' }} />
              Filter
            </Button>
          </div>
        </div>

        {loading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '50vh',
            color: 'white'
          }}>
            <DotLoading color="primary" />
            <div style={{ marginTop: '12px', color: 'white' }}>Loading consultants...</div>
          </div>
        ) : (
          <div style={{ padding: '12px', paddingBottom: '80px' }}>
            {filteredConsultants.length === 0 ? (
              <Empty description="No consultants found" />
            ) : (
              consultantChunks.map((chunk, chunkIndex) => (
                <div key={chunkIndex}>
                  {/* Section Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                    padding: '0 4px'
                  }}>
                    <h3 style={{
                      margin: 0,
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: '600'
                    }}>
                      Top Consultants ({filteredConsultants.length})
                    </h3>
                  </div>

                  {/* 3x3 Grid */}
                  <Grid columns={3} gap={8} style={{ marginBottom: '16px' }}>
                    {chunk.map((consultant) => (
                      <ConsultantCard key={consultant._id} consultant={consultant} />
                    ))}
                  </Grid>

                  {/* NEW: Dynamic Advertisement Manager (Replaces old AdvertisementCard) */}
                  <div style={{ padding: '8px 12px', marginTop: '16px', marginBottom: '16px' }}>
                    <AdvertisementManager
                      advertisements={advertisements}
                      onAdUpdate={fetchAdvertisements}
                      isAdmin={isAdmin} // Admin gets upload/delete controls
                      positionId={chunkIndex} // Use the chunk index to place ads intermittently
                      pageKey="book-consultant" // Unique key for this page
                      key={chunkIndex} 
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        </PullToRefresh>
      </div>

      {/* Floating Action Button - Show for agent and consultant only */}
      {canUpload && (
        <div
          className="floating-action-button"
          onClick={() => setShowConsultantForm(true)}
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: '#1677ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000,
            cursor: 'pointer'
          }}
          title={isAgent ? "Add as Agent" : isConsultant ? "Add as Consultant" : ""}
        >
          <AddOutline className="fab-icon" />
        </div>
      )}

      {/* Modals and Popups */}
      <MenuPopup />
      <FilterModal />
      <ConsultantModal />

      {/* Show AgentRegistration for agents, AddConsultantModal for consultants */}
      {isAgent ? (
        <AgentRegistration
          visible={showConsultantForm}
          setVisible={setShowConsultantForm}
          refreshData={fetchConsultants}
          onSuccess={() => {
            Toast.show("Agent profile added successfully!");
            fetchConsultants();
          }}
          onCancel={() => setShowConsultantForm(false)}
        />
      ) : (
        <AddConsultantModal
          visible={showConsultantForm}
          setVisible={setShowConsultantForm}
          onCancel={() => setShowConsultantForm(false)}
          onSuccess={() => {
            Toast.show("Consultant added successfully!");
            fetchConsultants();
          }}
          refreshData={fetchConsultants}
          userLocation={{ lat: 21.1702, lon: 72.8311 }}
          userPhone={currentUser?.phone || "9876543210"}
          userRole="consultant"
        />
      )}
    </div>
  );
}