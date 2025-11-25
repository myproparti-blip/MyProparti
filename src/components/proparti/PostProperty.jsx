import React, { useState, useEffect, useRef } from "react";
import {
  Popup,
  Form,
  Input,
  Button,
  Card,
  Space,
  Tag,
  Selector,
  Switch,
  ImageUploader,
  Toast,
  Grid,
  Divider,
  ActionSheet,
  TextArea,
} from "antd-mobile";
import { 
  AppOutline, 
  CloseOutline, 
  VideoOutline,
  CameraOutline,
  PictureOutline,
  LocationOutline
} from "antd-mobile-icons";
import { createProperty, updateProperty } from "../../services/properties";

// ==================== HELPER FUNCTION: Number to Words ====================
const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = ['', 'Thousand', 'Lac', 'Crore'];

  if (num === 0) return 'Zero';
  
  const convertThreeDigits = (n) => {
    let result = '';
    const hundred = Math.floor(n / 100);
    if (hundred > 0) result += ones[hundred] + ' Hundred ';
    
    const remainder = n % 100;
    if (remainder >= 10 && remainder < 20) {
      result += teens[remainder - 10] + ' ';
    } else {
      const ten = Math.floor(remainder / 10);
      const one = remainder % 10;
      if (ten > 0) result += tens[ten];
      if (one > 0) result += (ten > 0 ? ' ' : '') + ones[one] + ' ';
    }
    return result.trim();
  };

  const parts = [];
  let scaleIndex = 0;
  
  while (num > 0 && scaleIndex < scales.length) {
    const part = num % (scaleIndex === 0 ? 1000 : 100);
    if (part > 0) {
      const words = convertThreeDigits(part);
      if (scales[scaleIndex]) {
        parts.unshift(words + ' ' + scales[scaleIndex]);
      } else {
        parts.unshift(words);
      }
    }
    
    if (scaleIndex === 0) {
      num = Math.floor(num / 1000);
    } else {
      num = Math.floor(num / 100);
    }
    scaleIndex++;
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
};

// ==================== VIDEO COMPRESSION FUNCTION ====================
const compressVideo = (file, maxSizeMB = 10, maxDurationMinutes = 5) => {
  return new Promise((resolve, reject) => {
    // First check file size and duration
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = function() {
      window.URL.revokeObjectURL(video.src);
      
      const duration = video.duration;
      const fileSizeMB = file.size / (1024 * 1024);
      
      console.log(`Video details - Size: ${fileSizeMB.toFixed(2)}MB, Duration: ${duration.toFixed(2)}s`);
      
      // Check if video meets requirements without compression
      if (fileSizeMB <= maxSizeMB && duration <= (maxDurationMinutes * 60)) {
        console.log('Video meets requirements, no compression needed');
        resolve(file);
        return;
      }
      
      // If video is too long or too large, show warning and reject
      if (duration > (maxDurationMinutes * 60)) {
        reject(new Error(`Video duration should be less than ${maxDurationMinutes} minutes`));
        return;
      }
      
      // If file is too large but duration is OK, try compression
      if (fileSizeMB > maxSizeMB) {
        compressVideoFile(file, maxSizeMB)
          .then(resolve)
          .catch(error => {
            console.warn('Video compression failed:', error);
            reject(new Error('Video is too large and compression failed. Please choose a smaller video.'));
          });
      }
    };
    
    video.onerror = function() {
      window.URL.revokeObjectURL(video.src);
      // If we can't read video metadata, proceed with original file but warn about size
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxSizeMB) {
        reject(new Error(`Video size (${fileSizeMB.toFixed(1)}MB) exceeds ${maxSizeMB}MB limit`));
      } else {
        resolve(file);
      }
    };
    
    video.src = URL.createObjectURL(file);
  });
};

const compressVideoFile = (file, maxSizeMB) => {
  return new Promise((resolve, reject) => {
    // Create video element to get dimensions
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    
    video.onloadedmetadata = function() {
      const originalSize = file.size;
      const targetSize = maxSizeMB * 1024 * 1024;
      const compressionRatio = Math.min(0.9, targetSize / originalSize);
      
      // Calculate target dimensions (reduce by compression ratio)
      const targetWidth = Math.floor(video.videoWidth * Math.sqrt(compressionRatio));
      const targetHeight = Math.floor(video.videoHeight * Math.sqrt(compressionRatio));
      
      // Create canvas for frame extraction (simplified compression)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      video.currentTime = 0;
      
      video.onseeked = function() {
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg', // Fallback to image if compression fails
              lastModified: Date.now(),
            });
            
            console.log(`Compressed from ${(originalSize/1024/1024).toFixed(2)}MB to ${(blob.size/1024/1024).toFixed(2)}MB`);
            resolve(compressedFile);
          } else {
            reject(new Error('Compression failed'));
          }
        }, 'image/jpeg', 0.7);
      };
    };
    
    video.onerror = () => {
      reject(new Error('Could not process video for compression'));
    };
  });
};

// Property Data Options
const PROPERTY_TYPES = [
  { label: "Apartment", value: "Apartment" },
  { label: "Studio", value: "Studio" },
  { label: "Independent House", value: "Independent House" },
  { label: "Villa", value: "Villa" },
  { label: "Plot", value: "Plot" },
  { label: "Commercial Office", value: "Commercial Office" },
  { label: "Commercial Shop", value: "Commercial Shop" },
  { label: "Warehouse", value: "Warehouse" },
  { label: "Industrial Land", value: "Industrial Land" },
  { label: "Farmhouse", value: "Farmhouse" }
];

const LISTING_TYPES = [
  { label: "For Sale", value: "Sale" },
  { label: "For Rent", value: "Rent" },
];

const BEDROOM_TYPES = [
  { label: "Studio", value: "Studio" },
  { label: "1 BHK", value: "1 BHK" },
  { label: "2 BHK", value: "2 BHK" },
  { label: "3 BHK", value: "3 BHK" },
  { label: "4 BHK", value: "4 BHK" },
  { label: "5 BHK", value: "5 BHK" },
  { label: "6 BHK+", value: "6 BHK+" },
  { label: "Independent Floor", value: "Independent Floor" }
];

const FURNISHING_TYPES = [
  { label: "Unfurnished", value: "Unfurnished" },
  { label: "Semi-Furnished", value: "Semi-Furnished" },
  { label: "Furnished", value: "Furnished" },
];

const AMENITIES = [
  "Lift", "Power Backup", "Visitor Parking", "Security", "Gated Community",
  "Club House", "Gym", "Swimming Pool", "Children's Play Area", "Jogging Track",
  "Indoor Games", "Banquet Hall", "Car Parking", "Wi-Fi", "Fire Safety",
  "Garden/Park", "Community Hall", "24x7 Water Supply", "Intercom", "Shopping Center"
];

const CONSTRUCTION_STATUS = [
  { label: "Ready to Move", value: "Ready to Move" },
  { label: "Under Construction", value: "Under Construction" },
  { label: "New", value: "New" },
  { label: "Resale", value: "Resale" }
];

const PRICE_UNITS_SALE = [
  { label: "₹", value: "rupees" },
  { label: "Lac", value: "lac" },
  { label: "Cr", value: "cr" }
];

const PRICE_UNITS_RENT = [
  { label: "₹", value: "rupees" },
  { label: "Thousand", value: "thousand" },
  { label: "Lac", value: "lac" }
];

const AREA_TYPES = [
  { label: "Carpet Area", value: "carpetArea", unit: "sq.ft" },
  { label: "Built-up Area", value: "builtupArea", unit: "sq.ft" },
  { label: "Super Built-up Area", value: "superBuiltupArea", unit: "sq.ft" }
];

export default function PostProperty({ visible, onClose, cityFromSearch, editMode = false, propertyData = null }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [stateLoading, setStateLoading] = useState(false);

  const [selectedPropertyType, setSelectedPropertyType] = useState([]);
  const [selectedListingType, setSelectedListingType] = useState([]);
  const [selectedBedrooms, setSelectedBedrooms] = useState([]);
  const [selectedFurnishing, setSelectedFurnishing] = useState([]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [selectedConstructionStatus, setSelectedConstructionStatus] = useState([]);
  const [negotiable, setNegotiable] = useState(false);

  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [imageActionVisible, setImageActionVisible] = useState(false);
  const [videoActionVisible, setVideoActionVisible] = useState(false);

  // Price and area states
  const [priceUnit, setPriceUnit] = useState("rupees");
  const [showAreaInputs, setShowAreaInputs] = useState(false);
  const [activeAreaType, setActiveAreaType] = useState("carpetArea");
  const [priceInputValue, setPriceInputValue] = useState("");
  const [actualPriceValue, setActualPriceValue] = useState("");
  
  // Location states
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [localityQuery, setLocalityQuery] = useState("");
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const debounceTimeoutRef = useRef(null);
  
  // Validation states
  const [missingFields, setMissingFields] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [originalNumber, setOriginalNumber] = useState("");

  // Refs for scrolling to fields
  const fieldRefs = useRef({});

  // ==================== EDIT MODE: PRE-FILL FORM ====================
  useEffect(() => {
    if (visible && editMode && propertyData) {
      // Pre-fill all form fields with propertyData
      console.log("📝 EDIT MODE - Pre-filling form with:", propertyData);
      
      // Basic Information
      form.setFieldsValue({
        title: propertyData.title || "",
        description: propertyData.description || "",
      });
      
      // Set selector values
      setSelectedPropertyType(propertyData.propertyType ? [propertyData.propertyType] : []);
      setSelectedListingType(propertyData.listingType ? [propertyData.listingType] : []);
      setSelectedBedrooms(propertyData.bedrooms ? [propertyData.bedrooms] : []);
      setSelectedFurnishing(propertyData.furnishing ? [propertyData.furnishing] : []);
      setSelectedConstructionStatus(propertyData.constructionStatus ? [propertyData.constructionStatus] : []);
      
      // Price & Area
      if (propertyData.price) {
        setActualPriceValue(propertyData.price.toString());
        setPriceInputValue(propertyData.price.toString());
        form.setFieldValue('price', propertyData.price.toString());
      }
      
      form.setFieldValue('carpetArea', propertyData.carpetArea || "");
      form.setFieldValue('builtupArea', propertyData.builtUpArea || "");
      form.setFieldValue('superBuiltupArea', propertyData.superBuiltUpArea || "");
      setNegotiable(propertyData.negotiable || false);
      
      // Location
      form.setFieldsValue({
        addressLine1: propertyData.addressLine1 || "",
        locality: propertyData.locality || "",
        city: propertyData.city || "",
        state: propertyData.state || "",
        pincode: propertyData.pincode || "",
      });
      
      // Amenities
      setSelectedAmenities(propertyData.amenities || []);
      
      // Set locality query for suggestions
      setLocalityQuery(propertyData.locality || "");
      
    }
  }, [visible, editMode, propertyData, form]);

  // -------------------- Auto-detect State from City --------------------
  const detectStateFromCity = async (cityName) => {
    if (!cityName || cityName.trim() === '') return;
    
    try {
      setStateLoading(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}, India&addressdetails=1&limit=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const state = data[0].address?.state;
          if (state) {
            form.setFieldValue('state', state);
          }
        }
      }
    } catch (error) {
      console.warn('State detection failed:', error);
    } finally {
      setStateLoading(false);
    }
  };

  // -------------------- Auto-fill from Search City --------------------
  useEffect(() => {
    if (visible && cityFromSearch) {
      const city = cityFromSearch.trim();
      form.setFieldValue('city', city);
      detectStateFromCity(city);
    }
  }, [visible, cityFromSearch, form]);

  // -------------------- FIXED: Real-Time Location Suggestions --------------------
  const handleLocalityChange = (value) => {
    setLocalityQuery(value);
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (!value || value.trim().length < 2) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      setSuggestionsLoading(false);
      return;
    }

    setSuggestionsLoading(true);
    setShowSuggestions(true);

    debounceTimeoutRef.current = setTimeout(() => {
      fetchLocationSuggestions(value.trim());
    }, 400);
  };

  const fetchLocationSuggestions = async (query) => {
    try {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: "REVERSE_GEOCODE",
            payload: { query },
          })
        );
      } else {
        await fetchBrowserLocationSuggestions(query);
      }
    } catch (error) {
      console.error("❌ Error fetching suggestions:", error);
      setSuggestionsLoading(false);
    }
  };

  const fetchBrowserLocationSuggestions = async (query) => {
    try {
      const searchQuery = `${query}, India`;
      const url = `https://nominatim.openstreetmap.org/search?` +
        `format=json` +
        `&q=${encodeURIComponent(searchQuery)}` +
        `&addressdetails=1` +
        `&limit=10` +
        `&countrycodes=in` +
        `&accept-language=en`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'PropertyApp/1.0',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

      const data = await response.json();
      
      const suggestions = data.map((item, index) => ({
        id: `${item.place_id || index}_${Date.now()}`,
        display_name: item.display_name,
        address: {
          name: item.address?.neighbourhood || 
                item.address?.suburb || 
                item.address?.hamlet ||
                item.address?.village ||
                item.address?.town ||
                item.address?.city_district ||
                item.name || 
                item.display_name?.split(',')[0] || 
                'Location',
          road: item.address?.road || item.address?.pedestrian || '',
          suburb: item.address?.suburb || item.address?.neighbourhood || item.address?.quarter || '',
          city: item.address?.city || 
                item.address?.town || 
                item.address?.village || 
                item.address?.municipality ||
                item.address?.county || 
                item.address?.state_district || '',
          state: item.address?.state || item.address?.region || '',
          pincode: item.address?.postcode || '',
          country: item.address?.country || 'India',
          latitude: item.lat || '',
          longitude: item.lon || '',
        },
      }));

      setLocationSuggestions(suggestions);
      setSuggestionsLoading(false);
      
      if (suggestions.length === 0) {
        Toast.show({
          content: "No locations found. Try different keywords.",
          duration: 2000
        });
      }
      
    } catch (error) {
      console.error("❌ Browser suggestions failed:", error);
      setLocationSuggestions([]);
      setSuggestionsLoading(false);
    }
  };

  const handleSuggestionSelect = (suggestion) => {
    const address = suggestion.address;
    
    const locality = address.suburb || address.neighbourhood || address.name || "";
    const city = address.city || "";
    const state = address.state || "";
    const pincode = address.pincode || "";
    
    const fullAddress = [
      address.name,
      address.road, 
      address.suburb,
      locality
    ].filter(Boolean).join(", ") || suggestion.display_name;

    setLocalityQuery(locality);
    
    form.setFieldsValue({
      locality: locality,
      city: city || form.getFieldValue('city') || cityFromSearch,
      state: state,
      pincode: pincode,
      addressLine1: fullAddress
    });

    setShowSuggestions(false);
    setLocationSuggestions([]);
  };

  // -------------------- Native Message Handler --------------------
  useEffect(() => {
    const handleNativeMessage = (event) => {
      try {
        let data;
        if (typeof event.data === 'string') {
          data = JSON.parse(event.data);
        } else if (event.nativeEvent) {
          data = JSON.parse(event.nativeEvent.data);
        } else {
          data = event;
        }

        if (data.type === "LOCATION_UPDATE") {
          const loc = data.payload;
          setLocalityQuery(loc.locality || "");
          setLocationLoading(false);
          
          form.setFieldsValue({
            addressLine1: loc.addressLine1 || "",
            locality: loc.locality || "",
            city: loc.city || "",
            state: loc.state || "",
            pincode: loc.pincode || "",
          });

        } else if (data.type === "LOCATION_SUGGESTIONS") {
          const suggestions = data.payload.suggestions || [];
          setLocationSuggestions(suggestions);
          setSuggestionsLoading(false);
          
          if (suggestions.length === 0 && localityQuery.length >= 2) {
            fetchBrowserLocationSuggestions(localityQuery);
          }
        }
      } catch (error) {
        console.log("❌ Invalid native message:", error);
        setSuggestionsLoading(false);
      }
    };

    window.addEventListener("message", handleNativeMessage);
    document.addEventListener("message", handleNativeMessage);

    return () => {
      window.removeEventListener("message", handleNativeMessage);
      document.removeEventListener("message", handleNativeMessage);
    };
  }, [form, localityQuery]);

  // -------------------- Location Functions --------------------
  const fetchLocationData = async () => {
    try {
      setLocationLoading(true);

      if (!navigator.geolocation) {
        Toast.show("Geolocation is not supported by your browser");
        setLocationLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            const locationData = await reverseGeocodeLocation(latitude, longitude);
            setLocalityQuery(locationData.locality || '');
            
            const cityToUse = cityFromSearch || locationData.city || '';
            
            form.setFieldValue('city', cityToUse || locationData.city || '');
            form.setFieldValue('pincode', locationData.pincode || '');
            form.setFieldValue('locality', locationData.locality || '');
            
            if (!cityFromSearch) {
              form.setFieldValue('state', locationData.state || '');
            } else {
              detectStateFromCity(cityToUse);
            }
            
            const maxAddressLength = 100;
            const address = locationData.address || '';
            const truncatedAddress = address.length > maxAddressLength 
              ? address.substring(0, maxAddressLength) + '...' 
              : address;
            
            form.setFieldValue('addressLine1', truncatedAddress);
            
          } catch (geocodeError) {
            console.warn('Reverse geocode failed:', geocodeError);
            Toast.show('Got location but address details unavailable. Please enter manually.');
          } finally {
            setLocationLoading(false);
          }
        },
        (error) => {
          let errorMessage = 'Location access denied';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location permissions.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timeout.';
              break;
            default:
              errorMessage = 'Unknown location error.';
              break;
          }
          Toast.show(errorMessage);
          setLocationLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000
        }
      );

    } catch (error) {
      console.error('Location fetch error:', error);
      Toast.show('Could not fetch location. Please enter manually.');
      setLocationLoading(false);
    }
  };

  const reverseGeocodeLocation = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
      );
      
      if (!response.ok) throw new Error('Geocoding failed');
      const data = await response.json();
      
      if (data.address) {
        const address = data.address;
        return {
          address: data.display_name,
          city: address.city || address.town || address.village || address.county || '',
          state: address.state || address.region || '',
          pincode: address.postcode || '',
          locality: address.neighbourhood || address.suburb || address.city_district || address.quarter || ''
        };
      }
      
      throw new Error('No address data found');
    } catch (error) {
      console.warn('Reverse geocode failed:', error);
      throw error;
    }
  };

  // -------------------- Effects --------------------
  useEffect(() => {
    if (visible) {
      if (cityFromSearch) {
        form.setFieldValue('city', cityFromSearch);
        detectStateFromCity(cityFromSearch);
      }
      
      setTimeout(() => {
        handleGetLocation();
      }, 500);
    } else {
      form.resetFields();
      setSelectedPropertyType([]);
      setSelectedListingType([]);
      setSelectedBedrooms([]);
      setSelectedFurnishing([]);
      setSelectedAmenities([]);
      setSelectedConstructionStatus([]);
      setNegotiable(false);
      setImages([]);
      setVideos([]);
      setPriceUnit("rupees");
      setShowAreaInputs(false);
      setActiveAreaType("carpetArea");
      setPriceInputValue("");
      setActualPriceValue("");
      setMissingFields([]);
      setFieldErrors({});
      setTouchedFields({});
      setLocationSuggestions([]);
      setShowSuggestions(false);
      setLocalityQuery("");
      setLocationLoading(false);
      setSuggestionsLoading(false);
      
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    }
  }, [visible, form, cityFromSearch]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      const suggestionsContainer = document.querySelector('.location-suggestions-container');
      if (suggestionsContainer && !suggestionsContainer.contains(e.target)) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showSuggestions]);

  const handleGetLocation = () => {
    setLocationLoading(true);
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: "REQUEST_LOCATION" })
      );
    } else {
      fetchLocationData();
    }
  };

  // -------------------- COMPLETELY FIXED: Price Calculation --------------------
  const getPriceMultiplier = () => {
    switch (priceUnit) {
      case 'lac': return 100000;
      case 'cr': return 10000000;
      case 'thousand': return 1000;
      default: return 1;
    }
  };

  const handlePriceChange = (value) => {
    const cleanValue = value.replace(/[^\d.]/g, '');
    
    if (!cleanValue) {
      setPriceInputValue("");
      setActualPriceValue("");
      setOriginalNumber("");
      form.setFieldValue('price', "");
      return;
    }
    
    setPriceInputValue(cleanValue);
    
    const numericValue = parseFloat(cleanValue);
    if (!isNaN(numericValue) && numericValue >= 0) {
      // Store the ORIGINAL number (only update when user types, not during unit changes)
      setOriginalNumber(numericValue.toString());
      setActualPriceValue(numericValue.toString());
      form.setFieldValue('price', numericValue.toString());
    }
  };

  const handlePriceUnitChange = (newUnit) => {
    if (!originalNumber || originalNumber === '') {
      setPriceUnit(newUnit);
      return;
    }
    
    const numericOriginal = parseFloat(originalNumber);
    if (!isNaN(numericOriginal)) {
      let displayValue;
      let actualRupees;

      if (newUnit === 'cr') {
        actualRupees = numericOriginal * 10000000;
        displayValue = actualRupees; // Show 560000000
      } 
      else if (newUnit === 'lac') {
        actualRupees = numericOriginal * 100000;
        displayValue = actualRupees; // Show 560000
      }
      else {
        actualRupees = numericOriginal;
        displayValue = numericOriginal;
      }

      setPriceInputValue(displayValue.toString());
      setActualPriceValue(actualRupees.toString());
      form.setFieldValue('price', actualRupees.toString());
    }
    
    setPriceUnit(newUnit);
  };

  // -------------------- Area Change Handler --------------------
  const handleAreaChange = (areaType, value) => {
    // Ensure the form field is updated when area is changed
    if (value !== undefined && value !== null) {
      form.setFieldValue(areaType, value);
    }
  };

  // -------------------- OPTIMIZED: Mobile Media Handler Functions --------------------
  const handleImageUpload = async (file) => {
    return {
      url: URL.createObjectURL(file),
      file: file
    };
  };

  const handleVideoUpload = async (file) => {
    const validVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/3gpp'];
    
    if (!validVideoTypes.includes(file.type)) {
      Toast.show('Please select a valid video file (MP4, MOV, AVI, MKV, 3GP)');
      return null;
    }

    // Show compression progress
    Toast.show({
      content: 'Processing video...',
      duration: 0,
      maskClickable: false
    });

    try {
      // Compress video to max 10MB and 5 minutes
      const compressedFile = await compressVideo(file, 10, 5);
      
      Toast.clear();
      
      if (compressedFile.size > 50 * 1024 * 1024) {
        Toast.show('Video file size should be less than 50MB');
        return null;
      }

      return {
        url: URL.createObjectURL(compressedFile),
        file: compressedFile,
        originalSize: file.size,
        compressedSize: compressedFile.size
      };
    } catch (error) {
      Toast.clear();
      Toast.show(error.message || 'Video processing failed');
      return null;
    }
  };

  const selectFromGallery = (type) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' : 'video/*';
    input.multiple = type === 'image';
    
    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        if (type === 'image') {
          handleImageFiles(files);
        } else {
          handleVideoFiles(files);
        }
      }
    };
    
    input.click();
  };

  const handleImageFiles = async (files) => {
    if (images.length + files.length > 10) {
      Toast.show('Maximum 10 images allowed');
      return;
    }

    const newImages = [];
    for (const file of files) {
      const result = await handleImageUpload(file);
      if (result) {
        newImages.push(result);
      }
    }

    setImages(prev => [...prev, ...newImages]);
    Toast.show(`Added ${files.length} image(s)`);
  };

  const handleVideoFiles = async (files) => {
    if (videos.length + files.length > 5) {
      Toast.show('Maximum 5 videos allowed');
      return;
    }

    const newVideos = [];
    for (const file of files) {
      const result = await handleVideoUpload(file);
      if (result) {
        newVideos.push(result);
      }
    }

    setVideos(prev => [...prev, ...newVideos]);
    Toast.show(`Added ${files.length} video(s)`);
  };

  const showImageActionSheet = () => {
    setImageActionVisible(true);
  };

  const showVideoActionSheet = () => {
    setVideoActionVisible(true);
  };

  const openCamera = async (type) => {
    // For mobile apps (React Native/Capacitor)
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "OPEN_CAMERA",
          payload: { mediaType: type }
        })
      );
      return;
    }

    // For web - try different approaches
    try {
      // Method 1: Use capture attribute (works on some mobile browsers)
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = type === 'image' ? 'image/*' : 'video/*';
      
      // Use capture attribute to force camera
      if (type === 'image') {
        input.setAttribute('capture', 'camera');
        input.setAttribute('accept', 'image/*');
      } else {
        input.setAttribute('capture', 'camcorder'); 
        input.setAttribute('accept', 'video/*');
      }
      
      input.onchange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
          if (type === 'image') {
            handleImageFiles(files);
          } else {
            handleVideoFiles(files);
          }
        }
      };
      
      input.click();
      
    } catch (error) {
      console.error('Camera error:', error);
      Toast.show('Camera not available. Using gallery instead.');
      selectFromGallery(type);
    }
  };

  const validateField = (fieldName, value) => {
    const errors = {};
    
    switch (fieldName) {
      case 'price':
        if (!value || parseFloat(value) <= 0) {
          errors.price = 'Please enter a valid price';
        }
        break;
        
      case 'carpetArea':
        // Carpet area is now optional
        break;
        
      case 'locality':
        if (!value || value.trim().length < 2) {
          errors.locality = 'Please enter locality/area';
        }
        break;
        
      case 'city':
        if (!value || value.trim().length < 2) {
          errors.city = 'Please enter city';
        }
        break;
        
      case 'state':
        if (!value || value.trim().length < 2) {
          errors.state = 'Please enter state';
        }
        break;
        
      case 'pincode':
        if (!value || value.length !== 6 || !/^\d+$/.test(value)) {
          errors.pincode = 'Please enter a valid 6-digit pincode';
        }
        break;
    }
    
    return errors;
  };

  const handleFieldBlur = (fieldName, value) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
    const errors = validateField(fieldName, value);
    setFieldErrors(prev => ({ ...prev, ...errors }));
  };

  const handleFieldChange = (fieldName, value) => {
    // Clear error when user starts typing
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => ({ ...prev, [fieldName]: '' }));
    }
  };

  const scrollToField = (fieldName) => {
    setTimeout(() => {
      const field = document.querySelector(`[name="${fieldName}"]`);
      if (field) {
        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
        field.focus();
        
        // Add highlight effect
        field.style.transition = 'all 0.3s ease';
        field.style.boxShadow = '0 0 0 2px #ff4d4f';
        setTimeout(() => {
          field.style.boxShadow = '';
        }, 2000);
      }
    }, 100);
  };

  // FIXED: Separate validation logic from side effects
  const validateFormData = () => {
    const values = form.getFieldsValue();
    const errors = {};
    const missing = [];

    console.log("🔍 VALIDATE FORM DATA - VALUES:", values);

    // Basic Information Validation
    if (!selectedPropertyType.length) {
      errors.propertyType = 'Property Type is required';
      missing.push('Property Type');
    }

    if (!selectedListingType.length) {
      errors.listingType = 'Listing Type is required';
      missing.push('Listing Type');
    }

    if (!selectedBedrooms.length) {
      errors.bedrooms = 'Bedrooms is required';
      missing.push('Bedrooms');
    }

    if (!selectedFurnishing.length) {
      errors.furnishing = 'Furnishing is required';
      missing.push('Furnishing');
    }

    // Pricing & Area Validation
    if (!values.price || parseFloat(values.price) <= 0) {
      errors.price = 'Price is required';
      missing.push('Price');
    }

    // Area validation - require at least one area field
    const hasCarpetArea = values.carpetArea && parseFloat(values.carpetArea) > 0;
    const hasBuiltupArea = values.builtupArea && parseFloat(values.builtupArea) > 0;
    const hasSuperBuiltupArea = values.superBuiltupArea && parseFloat(values.superBuiltupArea) > 0;
    
    if (!hasCarpetArea && !hasBuiltupArea && !hasSuperBuiltupArea) {
      errors.area = 'Please fill at least one area field (Carpet, Built-up, or Super Built-up)';
      missing.push('Area');
    }

    // Location Validation
    if (!values.addressLine1) {
      errors.addressLine1 = 'Address is required';
      missing.push('Address');
    } else if (values.addressLine1.length < 10) {
      errors.addressLine1 = 'Address seems too short';
    }

    if (!values.locality) {
      errors.locality = 'Locality is required';
      missing.push('Locality');
    }

    if (!values.city) {
      errors.city = 'City is required';
      missing.push('City');
    }

    if (!values.state) {
      errors.state = 'State is required';
      missing.push('State');
    }

    if (!values.pincode) {
      errors.pincode = 'Pincode is required';
      missing.push('Pincode');
    } else if (values.pincode.length !== 6 || !/^\d+$/.test(values.pincode)) {
      errors.pincode = 'Please enter valid 6-digit pincode';
    }

    console.log("🔍 VALIDATION RESULT:", { errors, missing, isValid: missing.length === 0 && Object.keys(errors).length === 0 });
    
    return { errors, missing, isValid: missing.length === 0 && Object.keys(errors).length === 0 };
  };

  // This function shows errors to user
  const showValidationErrors = (errors, missing) => {
    setFieldErrors(errors);
    setMissingFields(missing);

    if (missing.length > 0) {
      const firstMissing = missing[0];
      console.log("🔍 FIRST MISSING FIELD:", firstMissing);
      
      Toast.show({
        content: `Please check: ${firstMissing}`,
        duration: 3000
      });
      return false;
    }

    if (Object.keys(errors).length > 0) {
      const firstError = Object.keys(errors)[0];
      console.log("🔍 FIRST ERROR:", firstError);
      
      Toast.show({
        content: `Please fix: ${errors[firstError]}`,
        duration: 3000
      });
      return false;
    }

    return true;
  };

  // ==================== OPTIMIZED SUBMIT HANDLER ====================
  const handleSubmit = async (values) => {
    try {
      console.log("🚀 SUBMITTING FORM - VALIDATION CHECK");
      
      const validation = validateFormData();
      console.log("🔍 VALIDATION RESULT:", validation);
      
      if (!validation.isValid) {
        console.log("❌ VALIDATION FAILED");
        showValidationErrors(validation.errors, validation.missing);
        return;
      }

      console.log("✅ VALIDATION PASSED - PROCEEDING WITH SUBMISSION");
      
      setLoading(true);

      // Show upload progress
      let uploadProgress = 0;
      const progressToast = Toast.show({
        content: `Uploading... 0%`,
        duration: 0,
        maskClickable: false
      });

      const updateProgress = (progress) => {
        uploadProgress = progress;
        // Update toast content if possible, or show new toast
        Toast.show({
          content: `Uploading... ${progress}%`,
          duration: 0,
          maskClickable: false
        });
      };

      const formData = new FormData();
      
      // Basic info
      formData.append("title", values.title || "");
      formData.append("description", values.description || "");
      formData.append("price", actualPriceValue || values.price || "0");
      formData.append("carpetArea", values.carpetArea || "");
      formData.append("builtUpArea", values.builtupArea || "");
      formData.append("superBuiltUpArea", values.superBuiltupArea || "");
      formData.append("addressLine1", values.addressLine1 || "");
      formData.append("locality", values.locality || "");
      formData.append("city", values.city || "");
      formData.append("state", values.state || "");
      formData.append("pincode", values.pincode || "");
      formData.append("negotiable", negotiable.toString());
      formData.append("priceUnit", priceUnit);
      
      // Enum values
      formData.append("propertyType", selectedPropertyType[0] || "");
      formData.append("listingType", selectedListingType[0] || "");
      formData.append("bedrooms", selectedBedrooms[0] || "");
      formData.append("furnishing", selectedFurnishing[0] || "");
      formData.append("constructionStatus", selectedConstructionStatus[0] || "Resale");
      
      // Amenities
      selectedAmenities.forEach(amenity => {
        formData.append("amenities", amenity);
      });
      
      formData.append("postedBy", "owner");
      formData.append("status", "Available");
      formData.append("country", "India");

      // Log form data for debugging
      console.log("📋 FORM DATA CONTENTS:");
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value);
      }

      // Media files - add with progress tracking
      const totalFiles = images.length + videos.length;
      let filesProcessed = 0;

      // Add images
      for (const img of images) {
        if (img.file) {
          formData.append("images", img.file);
          filesProcessed++;
          updateProgress(Math.round((filesProcessed / totalFiles) * 50));
          // Small delay to prevent UI blocking
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Add videos
      for (const vid of videos) {
        if (vid.file) {
          formData.append("videos", vid.file);
          filesProcessed++;
          updateProgress(Math.round((filesProcessed / totalFiles) * 50));
          // Small delay to prevent UI blocking
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      updateProgress(100);

      console.log("🔄 MAKING API CALL...");
      let result;
      if (editMode && propertyData?._id) {
        console.log("✏️ UPDATING PROPERTY:", propertyData._id);
        result = await updateProperty(propertyData._id, formData);
      } else {
        console.log("🆕 CREATING NEW PROPERTY");
        result = await createProperty(formData);
      }
      
      console.log("📡 API RESPONSE:", result);
      
      Toast.clear();
      
      if (result.success) {
        console.log("✅ PROPERTY POSTED SUCCESSFULLY");
        Toast.show(editMode ? "Property updated successfully!" : "Property posted successfully!");
        onClose?.();
        window.dispatchEvent(new Event("propertyAdded"));
      } else {
        console.log("❌ API ERROR:", result.error);
        Toast.show(result.error || "Failed to post property. Please check all fields.");
      }
    } catch (err) {
      console.error("💥 SUBMISSION ERROR:", err);
      Toast.clear();
      Toast.show("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPriceUnits = () => {
    return selectedListingType[0] === 'Rent' ? PRICE_UNITS_RENT : PRICE_UNITS_SALE;
  };

  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      onClose={onClose}
      bodyStyle={{
        height: "90vh",
        borderTopLeftRadius: "16px",
        borderTopRightRadius: "16px",
        overflow: 'hidden'
      }}
    >
      <div className="post-property-popup" style={{ height: '100%', overflow: 'hidden' }}>
        {/* Header */}
        <div className="popup-header" style={{ 
          padding: '16px', 
          borderBottom: '1px solid #f0f0f0',
          background: 'white',
          position: 'sticky',
          top: 0,
          zIndex: 1000
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AppOutline style={{ fontSize: 20, color: '#1890ff' }} />
              <h3 style={{ margin: 0, color: '#333', fontSize: 18 }}>
                {editMode ? "Edit Property" : "Post New Property"}
              </h3>
            </div>
            <Button 
              fill="none" 
              size="small" 
              onClick={onClose} 
              style={{ color: '#666', padding: '8px' }}
            >
              <CloseOutline style={{ fontSize: 18 }} />
            </Button>
          </div>

          {cityFromSearch && (
            <div style={{ 
              fontSize: '12px', 
              color: '#1890ff', 
              marginTop: '4px',
              background: '#f0f8ff',
              padding: '4px 8px',
              borderRadius: '4px',
              display: 'inline-block'
            }}>
              📍 Auto-filled from search: {cityFromSearch}
            </div>
          )}
        </div>

        <div className="popup-content" style={{ height: 'calc(100% - 80px)', overflow: 'auto' }}>
          <Form
            form={form}
            onFinish={handleSubmit}
            footer={
              <div style={{ padding: '16px', background: 'white', borderTop: '1px solid #f0f0f0' }}>
                <Button 
                  block 
                  type="submit" 
                  color="primary" 
                  size="large" 
                  loading={loading}
                  style={{ borderRadius: '8px' }}
                >
                  {loading ? (editMode ? "Updating Property..." : "Posting Property...") : (editMode ? "Update Property" : "Post Property")}
                </Button>
                
                {missingFields.length > 0 && (
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '8px', 
                    background: '#fff2f0', 
                    border: '1px solid #ffccc7',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#a8071a'
                  }}>
                    ⚠️ Please fill all required fields
                  </div>
                )}
              </div>
            }
            style={{ '--adm-form-background-color': 'transparent' }}
          >
            {/* Basic Information */}
            <Card title="Basic Information" style={{ marginBottom: '16px', borderRadius: '12px' }}>
              <Space direction="vertical" block style={{ width: '100%' }}>
                <Form.Item 
                   label="Property Type" 
                   required
                   help={fieldErrors.propertyType}
                   validateStatus={fieldErrors.propertyType ? 'error' : ''}
                 >
                   <Selector 
                     options={PROPERTY_TYPES} 
                     value={selectedPropertyType} 
                     onChange={(value) => {
                       setSelectedPropertyType(value);
                       if (value && value.length > 0) {
                         setFieldErrors(prev => ({ ...prev, propertyType: '' }));
                       }
                     }}
                   />
                 </Form.Item>
                <Form.Item 
                  label="Listing Type" 
                  required
                  help={fieldErrors.listingType}
                  validateStatus={fieldErrors.listingType ? 'error' : ''}
                >
                  <Selector 
                    options={LISTING_TYPES} 
                    value={selectedListingType} 
                    onChange={setSelectedListingType}
                  />
                </Form.Item>
                <Form.Item 
                  label="Bedrooms" 
                  required
                  help={fieldErrors.bedrooms}
                  validateStatus={fieldErrors.bedrooms ? 'error' : ''}
                >
                  <Selector 
                    options={BEDROOM_TYPES} 
                    value={selectedBedrooms} 
                    onChange={setSelectedBedrooms}
                  />
                </Form.Item>
                <Form.Item 
                  label="Furnishing" 
                  required
                  help={fieldErrors.furnishing}
                  validateStatus={fieldErrors.furnishing ? 'error' : ''}
                >
                  <Selector 
                    options={FURNISHING_TYPES} 
                    value={selectedFurnishing} 
                    onChange={setSelectedFurnishing}
                  />
                </Form.Item>
                <Form.Item label="Construction Status">
                  <Selector 
                    options={CONSTRUCTION_STATUS} 
                    value={selectedConstructionStatus} 
                    onChange={setSelectedConstructionStatus}
                  />
                </Form.Item>
              </Space>
            </Card>

            {/* COMPLETELY FIXED: Pricing & Area */}
            <Card title="Pricing & Area" style={{ marginBottom: '16px', borderRadius: '12px' }}>
              <Space direction="vertical" block style={{ width: '100%' }}>
                {/* FIXED Price Input - No auto zeros */}
                <div>
                  <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px', fontWeight: '500' }}>
                    Price
                  </div>
                  <Grid columns={2} gap={8}>
                    <Form.Item 
                      name="price" 
                      rules={[{ required: true, message: 'Please enter price' }]}
                      help={fieldErrors.price}
                      validateStatus={fieldErrors.price ? 'error' : ''}
                    >
                      <Input 
                        type="text"
                        placeholder="Enter amount"
                        value={priceInputValue}
                        onChange={(value) => {
                          handlePriceChange(value);
                          handleFieldChange('price', value);
                        }}
                        onBlur={() => handleFieldBlur('price', priceInputValue)}
                        min={0}
                      />
                    </Form.Item>
                    <Form.Item>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {getCurrentPriceUnits().map((unit) => (
                          <Tag
                            key={unit.value}
                            color={priceUnit === unit.value ? "primary" : "default"}
                            onClick={() => handlePriceUnitChange(unit.value)}
                            style={{ 
                              cursor: 'pointer', 
                              padding: '4px 8px',
                              fontSize: '12px',
                              marginBottom: '4px'
                            }}
                          >
                            {unit.label}
                          </Tag>
                        ))}
                      </div>
                    </Form.Item>
                  </Grid>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    {selectedListingType[0] === 'Rent' ? 'Monthly rent' : 'Total price'} • 
                    {actualPriceValue ? numberToWords(parseInt(actualPriceValue)) : 'Enter price'}
                  </div>
                </div>

                {/* Area Types */}
                <div style={{ marginTop: '16px' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <div style={{ fontSize: '14px', color: '#333', fontWeight: '500' }}>
                      Area
                    </div>
                    <Button
                      size="small"
                      fill="none"
                      onClick={() => setShowAreaInputs(!showAreaInputs)}
                      style={{ color: '#1890ff', fontSize: '12px' }}
                    >
                      {showAreaInputs ? 'Hide' : 'Show All'}
                    </Button>
                  </div>

                  <Space wrap style={{ marginBottom: '12px' }}>
                    {AREA_TYPES.map((areaType) => (
                      <Tag
                        key={areaType.value}
                        color={activeAreaType === areaType.value ? "primary" : "default"}
                        onClick={() => setActiveAreaType(areaType.value)}
                        style={{ cursor: 'pointer' }}
                      >
                        {areaType.label}
                      </Tag>
                    ))}
                  </Space>

                  {!showAreaInputs && (
                    <Form.Item 
                      name={activeAreaType}
                      rules={[{ required: false, message: `Please enter ${AREA_TYPES.find(a => a.value === activeAreaType)?.label}` }]}
                      help={fieldErrors.carpetArea}
                      validateStatus={fieldErrors.carpetArea ? 'error' : ''}
                    >
                      <Input 
                        type="number"
                        placeholder={`Enter ${AREA_TYPES.find(a => a.value === activeAreaType)?.label} in sq.ft`}
                        suffix="sq.ft"
                        min={0}
                        onChange={(value) => {
                          handleAreaChange(activeAreaType, value);
                          handleFieldChange('carpetArea', value);
                        }}
                        onBlur={() => handleFieldBlur('carpetArea', form.getFieldValue('carpetArea'))}
                      />
                    </Form.Item>
                  )}

                  {showAreaInputs && (
                    <Space direction="vertical" block style={{ width: '100%' }}>
                      {AREA_TYPES.map((areaType) => (
                        <Form.Item 
                          key={areaType.value}
                          name={areaType.value}
                          label={areaType.label}
                          rules={[{ required: false, message: `Please enter ${areaType.label}` }]}
                          help={areaType.value === 'carpetArea' ? fieldErrors.carpetArea : ''}
                          validateStatus={areaType.value === 'carpetArea' && fieldErrors.carpetArea ? 'error' : ''}
                        >
                          <Input 
                            type="number"
                            placeholder={`Enter ${areaType.label} in ${areaType.unit}`}
                            suffix={areaType.unit}
                            min={0}
                            onChange={(value) => {
                              handleAreaChange(areaType.value, value);
                              if (areaType.value === 'carpetArea') {
                                handleFieldChange('carpetArea', value);
                              }
                            }}
                            onBlur={() => {
                              if (areaType.value === 'carpetArea') {
                                handleFieldBlur('carpetArea', form.getFieldValue('carpetArea'));
                              }
                            }}
                          />
                        </Form.Item>
                      ))}
                    </Space>
                  )}
                </div>

                <Form.Item label="Price Negotiable">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                    <span style={{ fontSize: '14px' }}>Negotiable Price</span>
                    <Switch checked={negotiable} onChange={setNegotiable} />
                  </div>
                </Form.Item>
              </Space>
            </Card>

            {/* Location */}
            <Card title="Location" style={{ marginBottom: '16px', borderRadius: '12px' }}>
              <Space direction="vertical" block style={{ width: '100%' }}>
                <div style={{ marginBottom: '12px' }}>
                  <Button
                    size="small"
                    color="primary"
                    fill="outline"
                    onClick={handleGetLocation}
                    loading={locationLoading}
                    style={{ 
                      fontSize: '12px',
                      height: '32px',
                      padding: '0 12px'
                    }}
                  >
                    <LocationOutline style={{ marginRight: '4px', fontSize: '14px' }} />
                    Use Current Location
                  </Button>

                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    {cityFromSearch ? `City from search: ${cityFromSearch}` : 'Auto-fill location using GPS'}
                  </div>
                </div>

                <Form.Item 
                  name="addressLine1" 
                  label="Address" 
                  rules={[{ required: true, message: 'Please enter address' }]}
                  help={fieldErrors.addressLine1}
                  validateStatus={fieldErrors.addressLine1 ? 'error' : ''}
                >
                  <TextArea 
                    placeholder="Full street address" 
                    rows={2}
                    maxLength={200}
                    showCount
                    onChange={(value) => handleFieldChange('addressLine1', value)}
                    onBlur={(e) => handleFieldBlur('addressLine1', e.target.value)}
                  />
                </Form.Item>
                
                {/* Locality Suggestions */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px', fontWeight: '500' }}>
                    Locality/Area {suggestionsLoading && "⏳"}
                  </div>
                  <div style={{ position: 'relative' }} className="location-suggestions-container">
                    <Input
                      placeholder="Type locality, area, city... (min 2 chars)"
                      value={localityQuery}
                      onChange={handleLocalityChange}
                      onFocus={() => {
                        if (localityQuery.length >= 2 && locationSuggestions.length > 0) {
                          setShowSuggestions(true);
                        }
                      }}
                      onClear={() => {
                        setLocalityQuery('');
                        form.setFieldValue('locality', '');
                        setShowSuggestions(false);
                        setLocationSuggestions([]);
                      }}
                      clearable
                    />
                    
                    {suggestionsLoading && (
                      <div style={{
                        position: 'absolute',
                        right: '32px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#1890ff',
                        fontSize: '12px',
                        background: 'white',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: '600'
                      }}>
                        🔄 Searching...
                      </div>
                    )}
                    
                    {showSuggestions && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'white',
                        border: '1px solid #e5e5e5',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 1000,
                        maxHeight: '300px',
                        overflow: 'auto',
                        marginTop: '4px'
                      }}>
                        {suggestionsLoading ? (
                          <div style={{ padding: '16px', textAlign: 'center', color: '#666' }}>
                            🔍 Searching locations across India...
                          </div>
                        ) : locationSuggestions.length > 0 ? (
                          <>
                            <div style={{
                              padding: '8px 16px',
                              background: '#f8f9fa',
                              borderBottom: '1px solid #e0e0e0',
                              fontSize: '11px',
                              color: '#666',
                              fontWeight: '600',
                              position: 'sticky',
                              top: 0
                            }}>
                              📍 Found {locationSuggestions.length} locations
                            </div>
                            {locationSuggestions.map((suggestion) => (
                              <div
                                key={suggestion.id}
                                onClick={() => handleSuggestionSelect(suggestion)}
                                style={{
                                  cursor: 'pointer',
                                  padding: '12px 16px',
                                  borderBottom: '1px solid #f0f0f0',
                                  fontSize: '14px',
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                              >
                                <div style={{ fontWeight: '500', marginBottom: '4px', color: '#1890ff' }}>
                                  {suggestion.address.name || suggestion.address.road || suggestion.address.suburb || 'Location'}
                                </div>
                                <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.4' }}>
                                  {suggestion.display_name}
                                </div>
                                {suggestion.address.city && (
                                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                                    📍 {suggestion.address.city} {suggestion.address.state && `• ${suggestion.address.state}`}
                                  </div>
                                )}
                              </div>
                            ))}
                          </>
                        ) : localityQuery.length >= 2 ? (
                          <div style={{ padding: '16px', textAlign: 'center', color: '#666' }}>
                            No locations found. Try different keywords.
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <Form.Item name="locality" style={{ display: 'none' }}>
                    <Input />
                  </Form.Item>
                </div>

                <Form.Item 
                  name="city" 
                  label="City" 
                  rules={[{ required: true, message: 'Please enter city' }]}
                  help={fieldErrors.city}
                  validateStatus={fieldErrors.city ? 'error' : ''}
                >
                  <Input 
                    placeholder="City" 
                    value={cityFromSearch || ''}
                    readOnly={!!cityFromSearch}
                    style={cityFromSearch ? { background: '#f0f8ff', color: '#1890ff' } : {}}
                    onChange={(value) => handleFieldChange('city', value)}
                    onBlur={(e) => handleFieldBlur('city', e.target.value)}
                  />
                </Form.Item>

                <Form.Item 
                  name="state" 
                  label="State" 
                  rules={[{ required: true, message: 'Please enter state' }]}
                  help={fieldErrors.state}
                  validateStatus={fieldErrors.state ? 'error' : ''}
                  extra={stateLoading ? "Detecting state..." : ""}
                >
                  <Input 
                    placeholder={stateLoading ? "Detecting state..." : "State"} 
                    readOnly={stateLoading}
                    style={stateLoading ? { background: '#f0f8ff', color: '#1890ff' } : {}}
                    onChange={(value) => handleFieldChange('state', value)}
                    onBlur={(e) => handleFieldBlur('state', e.target.value)}
                  />
                </Form.Item>

                <Form.Item 
                  name="pincode" 
                  label="Pincode" 
                  rules={[{ required: true, message: 'Please enter pincode' }]}
                  help={fieldErrors.pincode}
                  validateStatus={fieldErrors.pincode ? 'error' : ''}
                >
                  <Input 
                    placeholder="Pincode" 
                    type="number"
                    onChange={(value) => handleFieldChange('pincode', value)}
                    onBlur={(e) => handleFieldBlur('pincode', e.target.value)}
                  />
                </Form.Item>
              </Space>
            </Card>

            {/* Amenities */}
            <Card title="Amenities" style={{ marginBottom: '16px', borderRadius: '12px' }}>
              <div style={{ padding: '8px 0' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontStyle: 'italic' }}>
                  Select all applicable amenities
                </div>
                <Space wrap style={{ width: '100%' }}>
                  {AMENITIES.map((amenity) => (
                    <Tag
                      key={amenity}
                      color={selectedAmenities.includes(amenity) ? "primary" : "default"}
                      onClick={() => {
                        setSelectedAmenities((prev) =>
                          prev.includes(amenity) 
                            ? prev.filter((a) => a !== amenity) 
                            : [...prev, amenity]
                        );
                      }}
                      style={{ cursor: 'pointer', margin: '2px' }}
                    >
                      {amenity}
                    </Tag>
                  ))}
                </Space>
                {selectedAmenities.length > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '14px', color: '#1890ff' }}>
                    Selected: {selectedAmenities.length} amenities
                  </div>
                )}
              </div>
            </Card>

            {/* Property Details */}
            <Card title="Property Details" style={{ marginBottom: '16px', borderRadius: '12px' }}>
              <Space direction="vertical" block style={{ width: '100%' }}>
                <Form.Item 
                  name="title" 
                  label="Property Title" 
                  help={fieldErrors.title}
                  validateStatus={fieldErrors.title ? 'error' : ''}
                >
                  <Input 
                    placeholder="Beautiful 2 BHK Apartment" 
                    onChange={(value) => handleFieldChange('title', value)}
                    onBlur={(e) => handleFieldBlur('title', e.target.value)}
                  />
                </Form.Item>
                <Form.Item 
                  name="description" 
                  label="Description" 
                  help={fieldErrors.description}
                  validateStatus={fieldErrors.description ? 'error' : ''}
                >
                  <TextArea 
                    placeholder="Describe your property features, location advantages..." 
                    rows={3}
                    maxLength={500}
                    showCount
                    onChange={(value) => handleFieldChange('description', value)}
                    onBlur={(e) => handleFieldBlur('description', e.target.value)}
                  />
                </Form.Item>
              </Space>
            </Card>

            {/* OPTIMIZED: Media Upload - Mobile Compatible */}
            <Card title="Media" style={{ marginBottom: '16px', borderRadius: '12px' }}>
              <Space direction="vertical" block style={{ width: '100%' }}>
                {/* Images Section - OPTIMIZED for Mobile */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '8px' 
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>
                      📸 Images ({images.length}/10)
                    </div>
                    <Button
                      size="small"
                      color="primary"
                      fill="outline"
                      onClick={showImageActionSheet}
                    >
                      Add Images
                    </Button>
                  </div>
                  
                  {images.length > 0 ? (
                    <div style={{ 
                      border: '1px solid #e5e5e5', 
                      borderRadius: '8px', 
                      padding: '12px',
                      background: '#fafafa'
                    }}>
                      <ImageUploader
                        value={images}
                        onChange={setImages}
                        multiple
                        maxCount={10}
                        upload={handleImageUpload}
                      />
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#666', 
                        marginTop: '8px',
                        textAlign: 'center'
                      }}>
                        Click on images to remove or add more
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '24px',
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        border: '2px dashed #d9d9d9',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                      onClick={showImageActionSheet}
                    >
                      <PictureOutline style={{ fontSize: 32, color: "#1890ff", marginBottom: '12px' }} />
                      <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Add Property Images</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Upload up to 10 images of your property
                      </div>
                    </div>
                  )}
                </div>

                <Divider />

                {/* Videos Section - OPTIMIZED for Mobile */}
                <div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '8px' 
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>
                      🎥 Videos ({videos.length}/5)
                    </div>
                    <Button
                      size="small"
                      color="primary"
                      fill="outline"
                      onClick={showVideoActionSheet}
                    >
                      Add Videos
                    </Button>
                  </div>
                  
                  {/* Video Upload Tips */}
                  <div style={{
                    fontSize: '12px',
                    color: '#666',
                    background: '#f0f8ff',
                    padding: '8px',
                    borderRadius: '6px',
                    marginBottom: '12px',
                    border: '1px solid #d6e4ff'
                  }}>
                    ⚡ <strong>Video Tips:</strong> For faster upload, use videos under 10MB and shorter than 5 minutes. 
                    Large videos will be automatically compressed.
                  </div>
                  
                  {videos.length > 0 ? (
                    <div style={{ 
                      border: '1px solid #e5e5e5', 
                      borderRadius: '8px', 
                      padding: '12px',
                      background: '#fafafa'
                    }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                        {videos.map((video, index) => (
                          <div
                            key={index}
                            style={{
                              width: '120px',
                              height: '90px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              position: 'relative',
                              background: '#000',
                              border: '2px solid #e5e5e5'
                            }}
                          >
                            <video
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              src={video.url}
                            />
                            <Button
                              size="mini"
                              fill="none"
                              style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                background: 'rgba(0,0,0,0.7)',
                                color: 'white',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                minWidth: '20px',
                                fontSize: '12px'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setVideos(prev => prev.filter((_, i) => i !== index));
                              }}
                            >
                              ×
                            </Button>
                            {video.originalSize && video.compressedSize && (
                              <div style={{
                                position: 'absolute',
                                bottom: '0',
                                left: '0',
                                right: '0',
                                background: 'rgba(0,0,0,0.7)',
                                color: 'white',
                                fontSize: '8px',
                                padding: '2px 4px',
                                textAlign: 'center'
                              }}>
                                {Math.round((video.compressedSize / video.originalSize) * 100)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#666',
                        textAlign: 'center'
                      }}>
                        {videos.length}/5 videos added • Videos are automatically optimized for faster upload
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '24px',
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        border: '2px dashed #d9d9d9',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                      onClick={showVideoActionSheet}
                    >
                      <VideoOutline style={{ fontSize: 32, color: "#1890ff", marginBottom: '12px' }} />
                      <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Add Property Videos</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Upload up to 5 videos (max 50MB each, automatically compressed to 10MB)
                      </div>
                    </div>
                  )}
                </div>
              </Space>
            </Card>
          </Form>
        </div>
      </div>

      {/* Image Action Sheet */}
      <ActionSheet
        visible={imageActionVisible}
        actions={[
          { text: 'Choose from Gallery', key: 'gallery', icon: <PictureOutline /> },
          { text: 'Cancel', key: 'cancel', bold: true }
        ]}
        onClose={() => setImageActionVisible(false)}
        onAction={action => {
          setImageActionVisible(false);
          if (action.key === 'gallery') {
            selectFromGallery('image');
          }
        }}
      />

      {/* Video Action Sheet */}
      <ActionSheet
        visible={videoActionVisible}
        actions={[
          { text: 'Choose from Gallery', key: 'gallery', icon: <PictureOutline /> },
          { text: 'Cancel', key: 'cancel', bold: true }
        ]}
        onClose={() => setVideoActionVisible(false)}
        onAction={action => {
          setVideoActionVisible(false);
          if (action.key === 'gallery') {
            selectFromGallery('video');
          }
        }}
      />
    </Popup>
  );
}