import React, { useState, useEffect, useRef } from 'react';
import { 
  Popup,
  Button, 
  Input, 
  TextArea, 
  Toast,
  ImageUploader,
  Dialog,
  Space,
  Card,
  Avatar,
  Badge,
  ActionSheet
} from 'antd-mobile';
import { 
  CloseOutline,
  CameraOutline, 
  PictureOutline, 
  LocationOutline, 
  AppOutline 
} from 'antd-mobile-icons';
import { addAgent, updateAgent } from '../services/agents';

const AgentModal = ({ 
  visible, 
  setVisible, 
  agent, 
  refreshData, 
  onSuccess, 
  onCancel,
  currentUser,
  mode = "add",
  agentData = null 
}) => {
  const [isPropertyDealer, setIsPropertyDealer] = useState(true);
  const [agentName, setAgentName] = useState('');
  const [firmName, setFirmName] = useState('');
  const [operatingSince, setOperatingSince] = useState('');
  const [teamMembers, setTeamMembers] = useState('');
  const [dealsIn, setDealsIn] = useState([]);
  const [aboutAgent, setAboutAgent] = useState('');
  const [loading, setLoading] = useState(false);
  
  // New state for "Others" deal type
  const [showOtherDealsInput, setShowOtherDealsInput] = useState(false);
  const [otherDeals, setOtherDeals] = useState([]);
  const [currentOtherDeal, setCurrentOtherDeal] = useState('');
  
  // ✅ FIXED: File upload states - use arrays like consultant component
  const [imageFile, setImageFile] = useState([]);
  const [idProofFile, setIdProofFile] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [idProofPreview, setIdProofPreview] = useState(null);
  
  // Action sheet states
  const [imageActionVisible, setImageActionVisible] = useState(false);
  const [idProofActionVisible, setIdProofActionVisible] = useState(false);

  // Location states
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [localityQuery, setLocalityQuery] = useState('');
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [stateLoading, setStateLoading] = useState(false);
  const debounceTimeoutRef = useRef(null);

  // States for areas functionality
  const [operatingAreaChips, setOperatingAreaChips] = useState([]);
  const [areaSearchText, setAreaSearchText] = useState('');

  // Form state for location fields
  const [formData, setFormData] = useState({
    addressLine1: '',
    locality: '',
    city: '',
    state: '',
    pincode: ''
  });

  // Track mounted for async safety
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const visibleRef = useRef(visible);
  useEffect(() => { visibleRef.current = visible; }, [visible]);

  // ✅ UPDATED: Effect to autofill form when in edit mode
  useEffect(() => {
    if (visible) {
      if (mode === "edit" && agentData) {
        console.log("🔄 EDIT MODE: Autofilling form with agent data:", agentData);
        autofillForm(agentData);
      } else {
        resetForm();
      }
    }
  }, [visible, mode, agentData]);

  // ✅ UPDATED: Autofill form function
  const autofillForm = (data) => {
    try {
      console.log("📝 Autofilling agent form with:", data);
      
      // Basic information
      setAgentName(data.agentName || "");
      setFirmName(data.firmName || "");
      setOperatingSince(data.operatingSince || "");
      setTeamMembers(data.teamMembers || "");
      setAboutAgent(data.aboutAgent || "");
      setIsPropertyDealer(data.isPropertyDealer !== "no");

      // Deals in
      let dealsArray = [];
      if (typeof data.dealsIn === 'string') {
        dealsArray = data.dealsIn.split(',').map(d => d.trim()).filter(Boolean);
      } else if (Array.isArray(data.dealsIn)) {
        dealsArray = data.dealsIn;
      }
      setDealsIn(dealsArray);

      // Handle "Others" deal type
      if (dealsArray.includes('Others') && data.dealsInOther) {
        let otherDealsArray = [];
        if (typeof data.dealsInOther === 'string') {
          otherDealsArray = data.dealsInOther.split(',').map(d => d.trim()).filter(Boolean);
        } else if (Array.isArray(data.dealsInOther)) {
          otherDealsArray = data.dealsInOther;
        }
        setOtherDeals(otherDealsArray);
        setShowOtherDealsInput(otherDealsArray.length > 0);
      }

      // Operating areas
      if (data.operatingAreaChips) {
        let areasArray = [];
        if (typeof data.operatingAreaChips === 'string') {
          areasArray = data.operatingAreaChips.split(',').map(a => a.trim()).filter(Boolean);
        } else if (Array.isArray(data.operatingAreaChips)) {
          areasArray = data.operatingAreaChips;
        }
        setOperatingAreaChips(areasArray);
      }

      // Location data
      const locationData = {
        addressLine1: data.addressLine1 || data.address || "",
        locality: data.locality || data.operatingCity || "",
        city: data.city || data.operatingCity || "",
        state: data.state || "",
        pincode: data.pincode || ""
      };
      
      setFormData(locationData);
      setLocalityQuery(locationData.locality || "");

      // ✅ FIXED: Image data - set preview URLs directly
      if (data.image) {
        setPreviewImage(data.image);
      }
      if (data.idProof) {
        setIdProofPreview(data.idProof);
      }

      console.log("✅ Agent form autofilled successfully");
    } catch (error) {
      console.error("❌ Error autofilling agent form:", error);
    }
  };

  const dealTypes = [
    'Flats', 'Villas', 'Plots', 'Commercial', 
    'Agricultural', 'Rent/Lease', 'Pre-launch', 
    'Original Booking', 'Resale', 'Others'
  ];

  // Handle "Others" deal type selection
  const toggleDeal = (deal) => {
    if (deal === 'Others') {
      setShowOtherDealsInput(!showOtherDealsInput);
      if (!dealsIn.includes('Others')) {
        setDealsIn(prev => [...prev, 'Others']);
      } else if (dealsIn.includes('Others') && otherDeals.length === 0) {
        setDealsIn(prev => prev.filter(d => d !== 'Others'));
        setShowOtherDealsInput(false);
      }
    } else {
      setDealsIn(prev => 
        prev.includes(deal) 
          ? prev.filter(d => d !== deal)
          : [...prev, deal]
      );
    }
  };

  // Add custom deal type
  const addOtherDeal = () => {
    if (currentOtherDeal.trim() && !otherDeals.includes(currentOtherDeal.trim())) {
      setOtherDeals(prev => [...prev, currentOtherDeal.trim()]);
      setCurrentOtherDeal('');
    }
  };

  // Remove custom deal type
  const removeOtherDeal = (dealToRemove) => {
    setOtherDeals(prev => prev.filter(deal => deal !== dealToRemove));
    // If no other deals left, remove "Others" from dealsIn
    if (otherDeals.length === 1) {
      setDealsIn(prev => prev.filter(d => d !== 'Others'));
      setShowOtherDealsInput(false);
    }
  };

  // -------------------- LOCATION HANDLING --------------------

  // Auto-detect state from city
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
            setFormData(prev => ({ ...prev, state: state }));
          }
        }
      }
    } catch (error) {
      console.warn('State detection failed:', error);
    } finally {
      setStateLoading(false);
    }
  };

  // Real-Time Location Suggestions with debounce
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
      console.error("Error fetching suggestions:", error);
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
      console.error("Browser suggestions failed:", error);
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
    
    setFormData({
      addressLine1: fullAddress,
      locality: locality,
      city: city,
      state: state,
      pincode: pincode
    });

    setShowSuggestions(false);
    setLocationSuggestions([]);
    
    Toast.show({
      content: `Location selected: ${locality}`,
      duration: 2000
    });
  };

  // Native Message Handler for React Native
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
          
          setFormData({
            addressLine1: loc.addressLine1 || "",
            locality: loc.locality || "",
            city: loc.city || "",
            state: loc.state || "",
            pincode: loc.pincode || "",
          });

          Toast.show("Location detected successfully!");

        } else if (data.type === "LOCATION_SUGGESTIONS") {
          const suggestions = data.payload.suggestions || [];
          setLocationSuggestions(suggestions);
          setSuggestionsLoading(false);
          
          if (suggestions.length === 0 && localityQuery.length >= 2) {
            fetchBrowserLocationSuggestions(localityQuery);
          }
        }
      } catch (error) {
        console.log("Invalid native message:", error);
        setSuggestionsLoading(false);
      }
    };

    window.addEventListener("message", handleNativeMessage);
    document.addEventListener("message", handleNativeMessage);

    return () => {
      window.removeEventListener("message", handleNativeMessage);
      document.removeEventListener("message", handleNativeMessage);
    };
  }, [localityQuery]);

  // Location detection
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
            
            setFormData({
              addressLine1: locationData.address || '',
              locality: locationData.locality || '',
              city: locationData.city || '',
              state: locationData.state || '',
              pincode: locationData.pincode || ''
            });
            
            Toast.show('Location detected successfully!');
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

  // -------------------- END LOCATION HANDLING --------------------

  // ✅ FIXED: Image Upload Functions - Updated to match consultant component
  const handleImageUpload = async (file) => {
    if (!file || !file.type) return { url: "" };

    if (!file.type.startsWith("image/")) {
      Toast.show({ 
        content: "Please upload a valid image file", 
        position: 'top',
        duration: 3000
      });
      return { url: "" };
    }

    if (file.size > 5 * 1024 * 1024) {
      Toast.show({ 
        content: "Image size should be less than 5MB", 
        position: 'top',
        duration: 3000
      });
      return { url: "" };
    }

    const imageUrl = URL.createObjectURL(file);
    setImageFile([file]); // ✅ FIXED: Set as array like consultant component
    setPreviewImage(imageUrl);
    
    Toast.show({ 
      content: 'Profile image uploaded successfully!', 
      position: 'top',
      duration: 2000
    });
    
    return { url: imageUrl };
  };

  const handleIdProofUpload = async (file) => {
    if (!file || !file.type) return { url: "" };

    if (!file.type.startsWith("image/")) {
      Toast.show({ 
        content: "Please upload a valid image file for ID proof", 
        position: 'top',
        duration: 3000
      });
      return { url: "" };
    }

    if (file.size > 5 * 1024 * 1024) {
      Toast.show({ 
        content: "ID proof size should be less than 5MB", 
        position: 'top',
        duration: 3000
      });
      return { url: "" };
    }

    const imageUrl = URL.createObjectURL(file);
    setIdProofFile([file]); // ✅ FIXED: Set as array like consultant component
    setIdProofPreview(imageUrl);
    
    Toast.show({ 
      content: 'ID proof uploaded successfully!', 
      position: 'top',
      duration: 2000
    });
    
    return { url: imageUrl };
  };

  // ✅ FIXED: Gallery Functions - Updated to match consultant component
  const selectFromGallery = (type) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = false;
    
    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        if (type === 'profile') {
          handleImageFiles(files);
        } else {
          handleIdProofFiles(files);
        }
      }
    };
    
    input.click();
  };

  const handleImageFiles = async (files) => {
    if (files.length > 0) {
      const result = await handleImageUpload(files[0]);
      if (result.url) {
        Toast.show('Profile photo added successfully!');
      }
    }
  };

  const handleIdProofFiles = async (files) => {
    if (files.length > 0) {
      const result = await handleIdProofUpload(files[0]);
      if (result.url) {
        Toast.show('ID proof added successfully!');
      }
    }
  };

  // Action Sheet handlers
  const showImageActionSheet = () => {
    setImageActionVisible(true);
  };

  const showIdProofActionSheet = () => {
    setIdProofActionVisible(true);
  };

  // ✅ FIXED: Remove image functions - Updated to match consultant component
  const handleRemoveImage = (type) => {
    if (type === 'profile') {
      if (previewImage && previewImage.startsWith('blob:')) {
        URL.revokeObjectURL(previewImage);
      }
      setImageFile([]); // ✅ FIXED: Clear the array
      setPreviewImage(null);
      Toast.show({ 
        content: 'Profile image removed', 
        position: 'top',
        duration: 2000
      });
    } else if (type === 'idProof') {
      if (idProofPreview && idProofPreview.startsWith('blob:')) {
        URL.revokeObjectURL(idProofPreview);
      }
      setIdProofFile([]); // ✅ FIXED: Clear the array
      setIdProofPreview(null);
      Toast.show({ 
        content: 'ID proof removed', 
        position: 'top',
        duration: 2000
      });
    }
  };

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      if (previewImage && previewImage.startsWith('blob:')) {
        URL.revokeObjectURL(previewImage);
      }
      if (idProofPreview && idProofPreview.startsWith('blob:')) {
        URL.revokeObjectURL(idProofPreview);
      }
    };
  }, []);

  const toggleArea = (area) => {
    setOperatingAreaChips(prev => 
      prev.includes(area) 
        ? prev.filter(a => a !== area)
        : [...prev, area]
    );
  };

  const addCustomArea = () => {
    if (areaSearchText.trim() && !operatingAreaChips.includes(areaSearchText.trim())) {
      setOperatingAreaChips(prev => [...prev, areaSearchText.trim()]);
      setAreaSearchText('');
    }
  };

  const removeArea = (areaToRemove) => {
    setOperatingAreaChips(prev => prev.filter(area => area !== areaToRemove));
  };

  // ✅ UPDATED: Validate form to handle edit mode
  const validateForm = () => {
    if (!agentName.trim()) {
      Toast.show({ content: 'Please enter Agent Name', position: 'top' });
      return false;
    }
    if (dealsIn.length === 0) {
      Toast.show({ content: 'Please select at least one Deal Type', position: 'top' });
      return false;
    }
    if (!formData.city.trim()) {
      Toast.show({ content: 'Please enter Operating City', position: 'top' });
      return false;
    }
    
    // In edit mode, images are optional if they already exist
    if (mode === "add") {
      if (!imageFile.length) {
        Toast.show({ content: 'Please upload Profile Image', position: 'top' });
        return false;
      }
      if (!idProofFile.length) {
        Toast.show({ content: 'Please upload ID Proof', position: 'top' });
        return false;
      }
    }
    
    return true;
  };

  // ✅ UPDATED: Handle submit to support both add and edit modes
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const formDataToSend = new FormData();
      
      // REQUIRED FIELDS
      formDataToSend.append('agentName', agentName.trim());
      formDataToSend.append('operatingCity', formData.city.trim());
      formDataToSend.append('dealsIn', dealsIn.join(','));
      formDataToSend.append('isPropertyDealer', isPropertyDealer ? "yes" : "no");

      // Add dealsInOther if "Others" is selected and has custom deals
      if (dealsIn.includes('Others') && otherDeals.length > 0) {
        formDataToSend.append('dealsInOther', otherDeals.join(','));
      }
      
      // OPTIONAL FIELDS
      if (firmName.trim()) formDataToSend.append('firmName', firmName.trim());
      if (operatingSince) formDataToSend.append('operatingSince', operatingSince);
      if (teamMembers) formDataToSend.append('teamMembers', teamMembers);
      if (aboutAgent.trim()) formDataToSend.append('aboutAgent', aboutAgent.trim());
      
      // Add operating areas if any
      if (operatingAreaChips.length > 0) {
        formDataToSend.append('operatingAreaChips', operatingAreaChips.join(','));
      }

      // Add additional location fields
      if (formData.addressLine1.trim()) formDataToSend.append('addressLine1', formData.addressLine1.trim());
      if (formData.locality.trim()) formDataToSend.append('locality', formData.locality.trim());
      if (formData.state.trim()) formDataToSend.append('state', formData.state.trim());
      if (formData.pincode.trim()) formDataToSend.append('pincode', formData.pincode.trim());

      // ✅ FIXED: Handle file uploads - use the first file from arrays
      if (imageFile.length > 0 && imageFile[0]) {
        formDataToSend.append('image', imageFile[0]);
      }
      if (idProofFile.length > 0 && idProofFile[0]) {
        formDataToSend.append('idProof', idProofFile[0]);
      }

      let response;
      if (mode === "edit" && agentData) {
        const agentId = agentData._id || agentData.id;
        if (!agentId) {
          throw new Error("Agent ID is required for update");
        }
        console.log("🔄 Updating agent with ID:", agentId);
        response = await updateAgent(agentId, formDataToSend);
      } else {
        console.log("➕ Creating new agent");
        response = await addAgent(formDataToSend);
      }

      if (response && response.success) {
        const successMessage = mode === "edit" 
          ? "Agent updated successfully!" 
          : "Registration Submitted Successfully!";
        
        Toast.show({ 
          content: response.message || successMessage, 
          position: 'top',
          duration: 3000
        });
        
        resetForm();
        setVisible(false);
        onSuccess?.(response.data);
        refreshData?.();
      } else {
        const errorMessage = response?.message || 
                          response?.error || 
                          response?.data?.message || 
                          (mode === "edit" ? "Failed to update agent" : "Registration failed. Please try again.");
        throw new Error(errorMessage);
      }
    
    } catch (error) {
      console.error(`${mode === "edit" ? "Update" : "Registration"} error:`, error);
      
      if (error.message.includes('Agent name, dealsIn, and operatingCity are required')) {
        Toast.show({ 
          content: 'Please fill all required fields: Agent Name, Deal Types, and Operating City',
          position: 'top',
          duration: 4000
        });
      } else if (error.message.includes('Please upload')) {
        Toast.show({ 
          content: error.message, 
          position: 'top',
          duration: 3000
        });
      } else {
        Toast.show({ 
          content: error.message || `${mode === "edit" ? "Update" : "Submission"} failed. Please try again.`, 
          position: 'top',
          duration: 3000
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ UPDATED: Reset form function
  const resetForm = () => {
    setAgentName('');
    setFirmName('');
    setOperatingSince('');
    setTeamMembers('');
    setDealsIn([]);
    setAboutAgent('');
    setIsPropertyDealer(true);
    setOperatingAreaChips([]);
    setAreaSearchText('');
    setImageFile([]); // ✅ FIXED: Reset to empty array
    setIdProofFile([]); // ✅ FIXED: Reset to empty array
    setPreviewImage(null);
    setIdProofPreview(null);
    setImageActionVisible(false);
    setIdProofActionVisible(false);
    setShowOtherDealsInput(false);
    setOtherDeals([]);
    setCurrentOtherDeal('');
    setFormData({
      addressLine1: '',
      locality: '',
      city: '',
      state: '',
      pincode: ''
    });
    setLocalityQuery('');
    setLocationSuggestions([]);
    setShowSuggestions(false);
    setLocationLoading(false);
    setSuggestionsLoading(false);
    setStateLoading(false);
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  };

  // Handle cancel button click
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      setVisible(false);
    }
    resetForm();
  };

  // Handle modal close
  const handleModalClose = () => {
    setVisible(false);
    resetForm();
  };

  // Custom Upload Button Component
  const Section = ({ title, icon, children }) => (
    <div style={{ 
      backgroundColor: 'white', 
      padding: '16px', 
      borderRadius: '12px',
      border: '1px solid #f0f0f0',
      marginBottom: '12px',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontWeight: 600, fontSize: 16, color: '#1a1a1a' }}>{title}</span>
      </div>
      {children}
    </div>
  );

  return (
    <>
      <Popup
        visible={visible}
        onMaskClick={handleModalClose}
        onClose={handleModalClose}
        bodyStyle={{
          height: "90vh",
          borderTopLeftRadius: "16px",
          borderTopRightRadius: "16px",
          overflow: 'hidden'
        }}
      >
        <div className="agent-modal-popup" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
                  {mode === "edit" ? "Edit Agent Profile" : "Agent Registration"}
                </h3>
              </div>
              <Button 
                fill="none" 
                size="small" 
                onClick={handleModalClose} 
                style={{ color: '#666', padding: '8px' }}
              >
                <CloseOutline style={{ fontSize: 18 }} />
              </Button>
            </div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
              {mode === "edit" ? "Update your agent profile" : "Complete all required fields"}
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="popup-content" style={{ height: 'calc(100% - 80px)', overflow: 'auto', padding: '16px' }}>

            {/* Property Dealer Question */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                marginBottom: '12px',
                color: '#333',
                fontWeight: 600
              }}>
                Are you a property dealer? <span style={{ color: '#ff4d4f' }}>*</span>
              </h3>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setIsPropertyDealer(true)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isPropertyDealer ? '#00897b' : '#e8d4f8',
                    color: isPropertyDealer ? 'white' : '#00897b',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  ✓ Yes
                </button>
                <button
                  onClick={() => setIsPropertyDealer(false)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: !isPropertyDealer ? '#00897b' : '#e8d4f8',
                    color: !isPropertyDealer ? 'white' : '#00897b',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  No
                </button>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e0e0e0', margin: '20px 0' }} />

            {/* ✅ FIXED: File Upload Section - Updated to match consultant component */}
            <Section title="Upload Documents" icon="📄">
              <Space direction="vertical" block style={{ '--gap': '16px', width: '100%' }}>
                {/* Profile Image Upload */}
                <div style={{ width: '100%' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#333' }}>
                    Profile Image {mode === "add" && <span style={{ color: '#ff4d4f' }}>*</span>}
                    {mode === "edit" && <span style={{ color: '#666', fontSize: '12px', marginLeft: '8px' }}>(Optional - keep existing if not changing)</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '12px', width: '100%' }}>
                    {previewImage ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <Badge content="Preview">
                          <Avatar 
                            src={previewImage} 
                            style={{ 
                              '--size': '100px',
                              borderRadius: '50%',
                              border: '3px solid #1677ff'
                            }}
                          />
                        </Badge>
                        <Button 
                          size="mini" 
                          color="danger" 
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveImage('profile'); }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      // ✅ FIXED: Use ImageUploader component like consultant
                      <ImageUploader
                        value={imageFile}
                        onChange={(files) => {
                          if (files.length > 0) {
                            handleImageUpload(files[0]);
                          } else {
                            handleRemoveImage('profile');
                          }
                        }}
                        upload={handleImageUpload}
                        maxCount={1}
                        onDelete={() => {
                          handleRemoveImage('profile');
                        }}
                        style={{
                          '--cell-size': '100px',
                          '--border-radius': '50%',
                          '--background-color': '#fafafa'
                        }}
                      >
                        <div style={{
                          width: '100px',
                          height: '100px',
                          border: '2px dashed #d9d9d9',
                          borderRadius: '50%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          color: '#666',
                          gap: 6,
                          cursor: 'pointer'
                        }}>
                          <span style={{ fontSize: 24 }}>📷</span>
                          <span style={{ fontSize: 11, textAlign: 'center' }}>Upload Photo</span>
                        </div>
                      </ImageUploader>
                    )}
                  </div>
                </div>

                {/* ID Proof Upload */}
                <div style={{ width: '100%' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#333' }}>
                    ID Proof Document {mode === "add" && <span style={{ color: '#ff4d4f' }}>*</span>}
                    {mode === "edit" && <span style={{ color: '#666', fontSize: '12px', marginLeft: '8px' }}>(Optional - keep existing if not changing)</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '12px', width: '100%' }}>
                    {idProofPreview ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <Badge content="Preview">
                          <Avatar 
                            src={idProofPreview} 
                            style={{ 
                              '--size': '100px',
                              borderRadius: '8px',
                              border: '2px solid #52c41a'
                            }}
                          />
                        </Badge>
                        <Button 
                          size="mini" 
                          color="danger" 
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveImage('idProof'); }}
                        >
                          Remove ID
                        </Button>
                      </div>
                    ) : (
                      // ✅ FIXED: Use ImageUploader component like consultant
                      <ImageUploader
                        value={idProofFile}
                        onChange={(files) => {
                          if (files.length > 0) {
                            handleIdProofUpload(files[0]);
                          } else {
                            handleRemoveImage('idProof');
                          }
                        }}
                        upload={handleIdProofUpload}
                        maxCount={1}
                        onDelete={() => {
                          handleRemoveImage('idProof');
                        }}
                        style={{
                          '--cell-size': '100px',
                          '--border-radius': '8px',
                          '--background-color': '#fafafa'
                        }}
                      >
                        <div style={{
                          width: '100%',
                          padding: '20px',
                          border: '2px dashed #d9d9d9',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          color: '#666',
                          gap: 8,
                          cursor: 'pointer',
                          boxSizing: 'border-box',
                          background: '#fafafa'
                        }}>
                          <span style={{ fontSize: 24 }}>🆔</span>
                          <span>Tap to upload ID Proof</span>
                          <span style={{ fontSize: 11, color: '#999', textAlign: 'center' }}>
                            Aadhaar, PAN, or Government ID
                          </span>
                        </div>
                      </ImageUploader>
                    )}
                  </div>
                </div>
              </Space>
            </Section>

            <div style={{ borderTop: '1px solid #e0e0e0', margin: '20px 0' }} />

            {/* Agent & Firm Details */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                marginBottom: '16px',
                color: '#333',
                fontWeight: 600
              }}>
                Agent & Firm Details
              </h3>
              
              <div>
                <Input
                  placeholder="Agent Name *"
                  value={agentName}
                  onChange={setAgentName}
                  style={{ 
                    marginBottom: '12px',
                    borderRadius: '8px'
                  }}
                />
              </div>
              
              <Input
                placeholder="Firm Name (Optional)"
                value={firmName}
                onChange={setFirmName}
                style={{ 
                  marginBottom: '12px'
                }}
              />
              
              <Input
                placeholder="Operating Since (e.g., 2015)"
                value={operatingSince}
                onChange={(value) => {
                  const numericValue = value.replace(/[^\d]/g, '').slice(0, 4);
                  setOperatingSince(numericValue);
                }}
                style={{ 
                  marginBottom: '12px'
                }}
                type="number"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={4}
              />
              
              <Input
                placeholder="Team Members"
                value={teamMembers}
                onChange={(value) => {
                  const numericValue = value.replace(/[^\d]/g, '').slice(0, 5);
                  setTeamMembers(numericValue);
                }}
                type="number"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={3}
              />
            </div>

            {/* Deals In Section */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                marginBottom: '12px',
                color: '#333',
                fontWeight: 600
              }}>
                Deals In <span style={{ color: '#ff4d4f' }}>*</span>
              </h3>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '8px' 
              }}>
                {dealTypes.map(deal => (
                  <button
                    key={deal}
                    onClick={() => toggleDeal(deal)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: dealsIn.includes(deal) ? '#00897b' : '#e8d4f8',
                      color: dealsIn.includes(deal) ? 'white' : '#00897b',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      flex: '1 0 calc(50% - 8px)',
                      minWidth: '120px'
                    }}
                  >
                    {deal}
                  </button>
                ))}
              </div>
              
              {/* Other Deals Input */}
              {showOtherDealsInput && (
                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '8px', color: '#666' }}>
                    Add Other Deal Types:
                  </h4>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <Input
                      placeholder="Enter deal type..."
                      value={currentOtherDeal}
                      onChange={setCurrentOtherDeal}
                      style={{ flex: 1 }}
                    />
                    <Button
                      size="small"
                      onClick={addOtherDeal}
                      disabled={!currentOtherDeal.trim()}
                      style={{
                        backgroundColor: '#ff9800',
                        color: 'white',
                        borderRadius: '6px'
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  
                  {/* Display other deals */}
                  {otherDeals.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {otherDeals.map((deal, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            backgroundColor: '#00897b',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: 500
                          }}
                        >
                          {deal}
                          <button
                            onClick={() => removeOtherDeal(deal)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'white',
                              marginLeft: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {dealsIn.length === 0 && (
                <div style={{ 
                  color: '#ff4d4f', 
                  fontSize: '12px', 
                  marginTop: '8px',
                  padding: '8px',
                  backgroundColor: '#fff2f0',
                  borderRadius: '4px'
                }}>
                  Please select at least one deal type
                </div>
              )}
            </div>

            {/* Operating Location Section */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                marginBottom: '12px',
                color: '#333',
                fontWeight: 600
              }}>
                Operating Location <span style={{ color: '#ff4d4f' }}>*</span>
              </h3>

              {/* Location Detection Button */}
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
                  Auto-fill location using GPS
                </div>
              </div>

              {/* Address Field */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px', fontWeight: '500' }}>
                  Address (Optional)
                </div>
                <TextArea
                  placeholder="Full street address"
                  rows={2}
                  maxLength={200}
                  showCount
                  value={formData.addressLine1}
                  onChange={(value) => setFormData(prev => ({ ...prev, addressLine1: value }))}
                />
              </div>

              {/* Locality/Area Input with Suggestions */}
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
                      setFormData(prev => ({ ...prev, locality: '' }));
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
              </div>

              {/* City, State, Pincode */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px', fontWeight: '500' }}>
                      City
                    </div>
                    <Input
                      placeholder="City"
                      value={formData.city}
                      onChange={(value) => {
                        setFormData(prev => ({ ...prev, city: value }));
                        if (value.trim()) detectStateFromCity(value);
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px', fontWeight: '500' }}>
                      State {stateLoading && "⏳"}
                    </div>
                    <Input
                      placeholder={stateLoading ? "Detecting..." : "State"}
                      value={formData.state}
                      onChange={(value) => setFormData(prev => ({ ...prev, state: value }))}
                      readOnly={stateLoading}
                      style={stateLoading ? { background: '#f0f8ff', color: '#1890ff' } : {}}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px', fontWeight: '500' }}>
                      Pincode
                    </div>
                    <Input
                      placeholder="Pincode"
                      value={formData.pincode}
                      onChange={(value) => setFormData(prev => ({ ...prev, pincode: value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Selected Areas Display */}
              {operatingAreaChips.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ 
                    fontSize: '14px', 
                    marginBottom: '8px',
                    color: '#666',
                    fontWeight: 500
                  }}>
                    Selected Operating Areas:
                  </h4>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '8px' 
                  }}>
                    {operatingAreaChips.map(area => (
                      <div
                        key={area}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '6px 12px',
                          borderRadius: '16px',
                          backgroundColor: '#00897b',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 500
                        }}
                      >
                        {area}
                        <button
                          onClick={() => removeArea(area)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            marginLeft: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Operating Areas */}
              <div>
                <h4 style={{ 
                  fontSize: '14px', 
                  marginBottom: '8px',
                  color: '#666',
                  fontWeight: 500
                }}>
                  Add Operating Areas (Optional):
                </h4>
                
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <Input
                    placeholder="Enter area name..."
                    value={areaSearchText}
                    onChange={setAreaSearchText}
                    style={{ flex: 1 }}
                  />
                  <Button
                    size="small"
                    onClick={addCustomArea}
                    disabled={!areaSearchText.trim()}
                    style={{
                      backgroundColor: '#ff9800',
                      color: 'white',
                      borderRadius: '6px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Add Area
                  </Button>
                </div>

                {operatingAreaChips.length === 0 && (
                  <div style={{
                    backgroundColor: '#fff8e1',
                    padding: '12px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    marginTop: '8px'
                  }}>
                    <span style={{ fontSize: '18px', marginRight: '8px' }}>ℹ️</span>
                    <span style={{ color: '#f57c00', fontSize: '13px' }}>
                      Add specific areas where you operate by typing above and clicking "Add Area".
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e0e0e0', margin: '20px 0' }} />

            {/* About Agent */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                marginBottom: '12px',
                color: '#333',
                fontWeight: 600
              }}>
                About Agent (Optional)
              </h3>
              
              <TextArea
                placeholder="Write a brief description about your services and firm..."
                value={aboutAgent}
                onChange={setAboutAgent}
                rows={4}
                style={{ 
                  borderRadius: '8px',
                  border: '1px solid #d9d9d9'
                }}
              />
            </div>

            {/* Submit Button */}
            <div style={{ 
              display: 'flex', 
              gap: '12px',
              marginTop: '24px'
            }}>
              <Button
                block
                onClick={handleCancel}
                disabled={loading}
                style={{
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 600,
                  height: '48px',
                  flex: 1,
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #d9d9d9'
                }}
              >
                Cancel
              </Button>
              <Button
                block
                color="primary"
                size="large"
                onClick={handleSubmit}
                loading={loading}
                style={{
                  backgroundColor: '#00897b',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 600,
                  height: '48px',
                  flex: 1
                }}
              >
                {loading 
                  ? (mode === "edit" ? 'Updating...' : 'Submitting...') 
                  : (mode === "edit" ? 'Update Agent' : 'Submit Registration')
                }
              </Button>
            </div>
          </div>
        </div>
      </Popup>

      {/* ✅ FIXED: Action Sheets - Updated to work with new file handling */}
      <ActionSheet
        visible={imageActionVisible}
        actions={[
          { text: 'Take Photo', key: 'camera', icon: <CameraOutline /> },
          { text: 'Choose from Gallery', key: 'gallery', icon: <PictureOutline /> },
        ]}
        onClose={() => setImageActionVisible(false)}
        onAction={action => {
          setImageActionVisible(false);
          if (action.key === 'camera') {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(
                JSON.stringify({
                  type: "OPEN_CAMERA",
                  payload: { uploadType: 'profile' }
                })
              );
            } else {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.setAttribute('capture', 'environment');
              input.onchange = (e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              };
              input.click();
            }
          } else if (action.key === 'gallery') {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(
                JSON.stringify({
                  type: "OPEN_GALLERY", 
                  payload: { uploadType: 'profile' }
                })
              );
            } else {
              selectFromGallery('profile');
            }
          }
        }}
        cancelText="Cancel"
      />

      <ActionSheet
        visible={idProofActionVisible}
        actions={[
          { text: 'Take Photo', key: 'camera', icon: <CameraOutline /> },
          { text: 'Choose from Gallery', key: 'gallery', icon: <PictureOutline /> },
        ]}
        onClose={() => setIdProofActionVisible(false)}
        onAction={action => {
          setIdProofActionVisible(false);
          if (action.key === 'camera') {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(
                JSON.stringify({
                  type: "OPEN_CAMERA",
                  payload: { uploadType: 'idProof' }
                })
              );
            } else {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.setAttribute('capture', 'environment');
              input.onchange = (e) => {
                const file = e.target.files?.[0];
                if (file) handleIdProofUpload(file);
              };
              input.click();
            }
          } else if (action.key === 'gallery') {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(
                JSON.stringify({
                  type: "OPEN_GALLERY", 
                  payload: { uploadType: 'idProof' }
                })
              );
            } else {
              selectFromGallery('idProof');
            }
          }
        }}
        cancelText="Cancel"
      />
    </>
  );
};

export default AgentModal;