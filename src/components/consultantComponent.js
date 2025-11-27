// consultantComponent.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Popup,
  Form,
  Input,
  Button,
  Toast,
  TextArea,
  ImageUploader,
  Avatar,
  Badge,
  Space,
  Selector,
  ActionSheet,
} from "antd-mobile";
import { CloseOutline, CameraOutline, PictureOutline, LocationOutline } from "antd-mobile-icons";
import { addConsultant, getConsultants, updateConsultant } from "../services/consultants";
import { fetchLocationSuggestions, fetchCurrentLocation } from "../services/locations";

const showFieldError = (fieldName) => {
  Toast.show({
    icon: "fail",
    content: `Please enter ${fieldName}`,
    duration: 2000,
  });
};

const getPlaceholderImage = (width = 150, height = 150) => {
  return `https://placehold.co/${width}x${height}/f0f0f0/666666/png?text=Consultant`;
};


const EXPERIENCE_LEVELS = [
  { label: "0-2 years", value: 1 },
  { label: "2-5 years", value: 3 },
  { label: "5-10 years", value: 7 },
  { label: "10+ years", value: 10 },
];

const MONEY_TYPE_OPTIONS = [
  { label: "Per 30 Minute", value: "minute" },
  { label: "Per 1 Hour", value: "hour" },
  { label: "Per Project", value: "project" },
];

const COMMON_LANGUAGES = [
  "English", "Hindi", "Spanish", "French", "German",
  "Japanese", "Russian",
  "Bengali", "Tamil", "Telugu", "Marathi", "Gujarati"
];

const EXPERTISE_AREAS = [
  "Market analysis",
  "Market research",
  "Negotiation",
  "Client consultation",
  "Customer service",
  "Property management",
  "Real estate negotiation",
  "Real Estate transactions",
  "Customer Relationship Management",
  "Analysis",
  "Market trends analysis",
  "Communication",
  "Consulting experience",
  "Online listings management",
  "Property proposals",
  "Problem solving",
  "Real estate appraisal",
  "Property marketing",
  "Investment recommendations",
  "Strategic planning"
];

const DESIGNATION_SUGGESTIONS = [
  "Junior Consultant",
  "Senior Consultant",
  "Real Estate Agent",
  "Property Advisor",
  "Investment Consultant",
  "Sales Executive",
  "Market Analyst",
  "Property Manager",
  "Real Estate Broker",
  "Negotiation Specialist"
];

export default function AddConsultantModal({
  visible,
  setVisible,
  refreshData,
  onSuccess,
  onCancel,
  userLocation,
  userPhone,
  mode = "add",
  consultantData = null,
  userRole = "consultant"  // agent or consultant
}) {
  
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const [imageFile, setImageFile] = useState(null);
  const [idProofFile, setIdProofFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [idProofPreview, setIdProofPreview] = useState(null);
  const [feeAmount, setFeeAmount] = useState(500);
  const [selectedMoneyType, setSelectedMoneyType] = useState(["project"]);
  const [selectedExperience, setSelectedExperience] = useState(null);
  const [selectedExpertise, setSelectedExpertise] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [designationInput, setDesignationInput] = useState("");

  // Action sheets
  const [imageActionVisible, setImageActionVisible] = useState(false);
  const [idProofActionVisible, setIdProofActionVisible] = useState(false);

  // ✅ FIXED: Optimized location states
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [localityQuery, setLocalityQuery] = useState("");
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [stateLoading, setStateLoading] = useState(false);
  const debounceTimeoutRef = useRef(null);

  // ✅ FIXED: Single form data state
  const [formData, setFormData] = useState({
    addressLine1: '',
    locality: '',
    city: '',
    state: '',
    pincode: ''
  });

  // track mounted for async safety
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const visibleRef = useRef(visible);
  useEffect(() => { visibleRef.current = visible; }, [visible]);

  useEffect(() => {
    const val = form.getFieldValue("designation") || "";
    setDesignationInput(val);
  }, [visible, form]);

  // ✅ FIXED: Optimized form field updates
  const updateFormField = useCallback((field, value) => {
    setFormData(prev => {
      if (prev[field] === value) return prev;
      return { ...prev, [field]: value };
    });
  }, []);

  // ✅ FIXED: Auto-detect state from city with better debounce
  const detectStateFromCity = useCallback(async (cityName) => {
    if (!cityName || cityName.trim() === '' || stateLoading) return;
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(async () => {
      if (!mountedRef.current) return;
      
      try {
        setStateLoading(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}, India&addressdetails=1&limit=1`
        );
        
        if (response.ok && mountedRef.current) {
          const data = await response.json();
          if (data && data.length > 0) {
            const state = data[0].address?.state;
            if (state && mountedRef.current) {
              updateFormField('state', state);
              form.setFieldValue('state', state);
            }
          }
        }
      } catch (error) {
        console.warn('State detection failed:', error);
      } finally {
        if (mountedRef.current) {
          setStateLoading(false);
        }
      }
    }, 1000);
  }, [stateLoading, form, updateFormField]);

  // ✅ FIXED: Optimized location suggestions
  const fetchLocationSuggestions = useCallback(async (query) => {
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
  }, []);

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

  // ✅ FIXED: Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion) => {
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
    
    // Update all form data at once
    setFormData({
      addressLine1: fullAddress,
      locality: locality,
      city: city,
      state: state,
      pincode: pincode
    });

    // Update form fields
    form.setFieldsValue({
      address: fullAddress,
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
  }, [form]);

  // ✅ FIXED: Native Message Handler
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

          form.setFieldsValue({
            address: loc.addressLine1 || "",
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
  }, [localityQuery, form, fetchBrowserLocationSuggestions]);

  // ✅ FIXED: Location detection
  const handleGetLocation = useCallback(() => {
    setLocationLoading(true);
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: "REQUEST_LOCATION" })
      );
    } else {
      fetchLocationData();
    }
  }, []);

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

            form.setFieldsValue({
              address: locationData.address || '',
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

  // ✅ FIXED: Close suggestions when clicking outside
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

  // ✅ FIXED: Optimized form initialization
  useEffect(() => {
    if (visible) {
      if (mode === "edit" && consultantData) {
        console.log("🔄 EDIT MODE: Autofilling form with consultant data:", consultantData);

        const expertiseArray = consultantData.expertise
          ? (typeof consultantData.expertise === 'string'
            ? consultantData.expertise.split(',').map(e => e.trim()).filter(Boolean)
            : Array.isArray(consultantData.expertise)
              ? consultantData.expertise
              : [])
          : [];

        const formValuesToSet = {
          name: consultantData.name || "",
          phone: consultantData.phone || "",
          designation: consultantData.designation || "",
          locality: consultantData.location || consultantData.locality || "",
          city: consultantData.city || "",
          state: consultantData.state || "",
          pincode: consultantData.pincode || "",
          address: consultantData.address || "",
          certifications: consultantData.certifications || "",
        };

        console.log("📝 Setting form values:", formValuesToSet);

        setTimeout(() => {
          form.setFieldsValue(formValuesToSet);
          setLocalityQuery(formValuesToSet.locality || "");
          
          setFormData({
            addressLine1: consultantData.address || "",
            locality: consultantData.location || consultantData.locality || "",
            city: consultantData.city || "",
            state: consultantData.state || "",
            pincode: consultantData.pincode || ""
          });
        }, 100);

        setFeeAmount(consultantData.money || 500);
        setSelectedMoneyType(consultantData.moneyType ? [consultantData.moneyType] : ["project"]);
        setSelectedExperience(consultantData.experience || null);
        setSelectedExpertise(expertiseArray);
        setSelectedLanguages(Array.isArray(consultantData.languages) ? consultantData.languages : []);
        setDesignationInput(consultantData.designation || "");
        setLocalityQuery(consultantData.location || consultantData.locality || "");

        if (consultantData.image) {
          setPreviewImage(consultantData.image);
        }
        if (consultantData.idProof) {
          setIdProofPreview(consultantData.idProof);
        }

        console.log("✅ Form autofilled successfully");
      } else {
        if (userLocation && typeof userLocation === 'object') {
          fetchLocationData();
        } else if (userLocation) {
          form.setFieldValue('location', userLocation);
        }

        if (userPhone) {
          form.setFieldValue('phone', userPhone);
        }
      }
    } else {
      handleReset();
    }
  }, [visible, userLocation, userPhone, form, mode, consultantData]);

  const incrementFee = () => setFeeAmount(prev => prev + 100);
  const decrementFee = () => setFeeAmount(prev => Math.max(100, prev - 100));

  const validateForm = () => {
    const errors = [];

    const formValues = form.getFieldsValue();

    console.log("🔄 FORM VALIDATION DEBUG:", {
      name: formValues.name,
      phone: formValues.phone,
      designation: formValues.designation,
      locality: formValues.locality,
      localityQuery: localityQuery,
      imageFile: !!imageFile,
      idProofFile: !!idProofFile,
      experience: selectedExperience,
      expertise: selectedExpertise.length,
      moneyType: selectedMoneyType.length
    });

    if (!formValues.name?.trim()) errors.push("Full Name");
    if (!formValues.phone?.trim()) errors.push("Phone Number");

    const localityValue = formValues.locality?.trim() || localityQuery?.trim();
    if (!localityValue) errors.push("Locality");

    if (!formValues.designation?.trim()) errors.push("Designation");

    if (!imageFile) errors.push("Profile Photo");
    if (!idProofFile) errors.push("ID Proof");
    if (!selectedExperience) errors.push("Experience Level");
    if (selectedExpertise.length === 0) errors.push("Area of Expertise");
    if (selectedMoneyType.length === 0) errors.push("Fee Type");

    return errors;
  };

  const handleSubmit = async () => {
    try {
      const formValues = form.getFieldsValue();
      const isEditMode = mode === "edit" && consultantData;

      console.log("=== FORM SUBMISSION DEBUG ===");
      console.log("Mode:", isEditMode ? "EDIT" : "ADD");
      console.log("Name:", formValues.name);
      console.log("Phone:", formValues.phone);
      console.log("Designation:", formValues.designation);
      console.log("Locality form value:", formValues.locality);
      console.log("Locality query:", localityQuery);
      console.log("Experience:", selectedExperience);
      console.log("Expertise count:", selectedExpertise.length);
      console.log("Money Type:", selectedMoneyType);
      console.log("Image File:", imageFile);
      console.log("ID Proof File:", idProofFile);
      console.log("Has existing images:", !!(consultantData?.image || consultantData?.idProof));

      // Use localityQuery if form value empty
      const finalLocality = (formValues.locality && formValues.locality.trim()) || localityQuery?.trim();

      if (!formValues.name?.trim() || !formValues.phone?.trim() || !formValues.designation?.trim() || !finalLocality) {
        Toast.show({
          icon: "fail",
          content: "Please fill all required fields including locality.",
          duration: 2000
        });
        return;
      }

      if (!isEditMode) {
        if (!imageFile) {
          Toast.show({ icon: "fail", content: "Please upload a profile photo.", duration: 2000 });
          return;
        }
        if (!idProofFile) {
          Toast.show({ icon: "fail", content: "Please upload an ID proof.", duration: 2000 });
          return;
        }
      }
      if (!selectedExperience) {
        Toast.show({ icon: "fail", content: "Please select your experience level.", duration: 2000 });
        return;
      }
      if (selectedExpertise.length === 0) {
        Toast.show({ icon: "fail", content: "Please select at least one area of expertise.", duration: 2000 });
        return;
      }
      if (selectedMoneyType.length === 0) {
        Toast.show({ icon: "fail", content: "Please select a fee type.", duration: 2000 });
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append("name", formValues.name);
      formDataToSend.append("phone", formValues.phone);
      formDataToSend.append("designation", formValues.designation);
      formDataToSend.append("location", finalLocality);
      formDataToSend.append("experience", selectedExperience);
      formDataToSend.append("money", feeAmount);
      formDataToSend.append("moneyType", selectedMoneyType[0]);
      formDataToSend.append("expertise", selectedExpertise.join(", "));
      formDataToSend.append("certifications", formValues.certifications || "");
      formDataToSend.append("address", formValues.address || "");
      selectedLanguages.forEach((lang) => formDataToSend.append("languages", lang));

      if (imageFile) {
        formDataToSend.append("image", imageFile);
      }
      if (idProofFile) {
        formDataToSend.append("idProof", idProofFile);
      }

      // Include all location fields
      if (formData.city) formDataToSend.append("city", formData.city);
      if (formData.state) formDataToSend.append("state", formData.state);
      if (formData.pincode) formDataToSend.append("pincode", formData.pincode);
      if (formData.addressLine1) formDataToSend.append("addressLine1", formData.addressLine1);

      setLoading(true);

      let res;
      if (isEditMode) {
        const consultantId = consultantData._id || consultantData.id;
        if (!consultantId) {
          throw new Error("Consultant ID is required for update");
        }
        console.log("🔄 Updating consultant with ID:", consultantId);
        res = await updateConsultant(consultantId, formDataToSend);
      } else {
        console.log("➕ Creating new consultant");
        res = await addConsultant(formDataToSend);
      }

      if (res.success) {
        Toast.show({
          icon: "success",
          content: isEditMode ? "Consultant updated successfully!" : "Consultant added successfully!"
        });
        handleReset();
        setVisible(false);
        refreshData?.();
        onSuccess?.(res.data);
      } else {
        throw new Error(res.error || (isEditMode ? "Failed to update consultant" : "Failed to add consultant"));
      }
    } catch (error) {
      console.error(error);
      Toast.show({ icon: "fail", content: error.message || "Something went wrong" });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setImageFile(null);
    setIdProofFile(null);
    setPreviewImage(null);
    setIdProofPreview(null);
    setFeeAmount(500);
    setSelectedMoneyType(["project"]);
    setSelectedExperience(null);
    setSelectedExpertise([]);
    setSelectedLanguages([]);
    setDesignationInput("");
    setLocationSuggestions([]);
    setShowSuggestions(false);
    setLocalityQuery("");
    setLocationLoading(false);
    setSuggestionsLoading(false);
    setStateLoading(false);
    
    setFormData({
      addressLine1: '',
      locality: '',
      city: '',
      state: '',
      pincode: ''
    });

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  };

  const handleCancel = () => {
    console.log("Cancel button clicked");
    handleReset();
    setVisible(false);
    onCancel?.();
  };

  const handleImageUpload = async (file) => {
    if (!file || !file.type) return { url: "" };

    if (!file.type.startsWith("image/")) {
      Toast.show({ icon: "fail", content: "Please upload a valid image file" });
      return { url: "" };
    }

    if (file.size > 5 * 1024 * 1024) {
      Toast.show({ icon: "fail", content: "Image size should be less than 5MB" });
      return { url: "" };
    }

    const imageUrl = URL.createObjectURL(file);
    setImageFile(file);
    setPreviewImage(imageUrl);
    return { url: imageUrl };
  };

  const handleIdProofUpload = async (file) => {
    if (!file || !file.type) return { url: "" };

    if (!file.type.startsWith("image/")) {
      Toast.show({ icon: "fail", content: "Please upload a valid image file for ID proof" });
      return { url: "" };
    }

    if (file.size > 5 * 1024 * 1024) {
      Toast.show({ icon: "fail", content: "ID proof size should be less than 5MB" });
      return { url: "" };
    }

    const imageUrl = URL.createObjectURL(file);
    setIdProofFile(file);
    setIdProofPreview(imageUrl);
    return { url: imageUrl };
  };

  const toggleExperience = (value, e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setSelectedExperience(prev => (prev === value ? prev : value));
  };

  const toggleExpertise = (expertise, e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setSelectedExpertise(prev =>
      prev.includes(expertise)
        ? prev.filter(e2 => e2 !== expertise)
        : [...prev, expertise]
    );
  };

  const toggleLanguage = (language, e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setSelectedLanguages((prev) => {
      if (prev.includes(language)) {
        return prev.filter((l) => l !== language);
      } else if (prev.length < 3) {
        return [...prev, language];
      } else {
        Toast.show({
          icon: "fail",
          content: "You can select up to 3 languages only.",
        });
        return prev;
      }
    });
  };

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

  const showImageActionSheet = () => {
    setImageActionVisible(true);
  };

  const showIdProofActionSheet = () => {
    setIdProofActionVisible(true);
  };

  // ✅ FIXED: Chip component
  const Chip = ({ label, selected, onToggle, small = false }) => {
    const isSmall = small || label.length > 12;
    
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle?.(e); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onToggle?.(e); } }}
        style={{
          padding: isSmall ? "1px 5px" : "1px 5px",
          borderRadius: "16px",
          border: `1.5px solid ${selected ? "#1677ff" : "#e0e0e0"}`,
          backgroundColor: selected ? "#1677ff" : "white",
          color: selected ? "white" : "#333",
          fontSize: isSmall ? "10px" : "11px",
          fontWeight: "500",
          cursor: "pointer",
          transition: "all 0.2s",
          userSelect: "none",
          flexShrink: 0,
          textAlign: "center",
          wordBreak: "break-word",
          whiteSpace: "normal",
          lineHeight: "1.2",
          minHeight: isSmall ? "32px" : "36px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "1 1 calc(50% - 6px)",
          minWidth: 0,
          margin: "2px",
        }}
      >
        {label}
      </div>
    );
  };
    
  const Counter = ({ value, onIncrement, onDecrement, label, unit }) => (
    <div style={{
      backgroundColor: '#f8f9fa',
      padding: '16px',
      borderRadius: '12px',
      border: '1px solid #e9ecef',
      width: '100%'
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#333', textAlign: 'center' }}>
        {label}
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        width: '100%'
      }}>
        <Button
          size="small"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDecrement(); }}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            fontSize: '20px',
            fontWeight: 'bold',
          }}
        >
          -
        </Button>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minWidth: '80px'
        }}>
          <span style={{ fontSize: 20, fontWeight: 'bold', color: '#1677ff' }}>
            {value}
          </span>
          <span style={{ fontSize: 12, color: '#666', marginTop: '4px' }}>
            {unit}
          </span>
        </div>

        <Button
          size="small"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onIncrement(); }}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            fontSize: '20px',
            fontWeight: 'bold',
          }}
        >
          +
        </Button>
      </div>
    </div>
  );

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

  const getMoneyTypeDisplay = () => {
    const type = selectedMoneyType[0];
    switch (type) {
      case 'minute': return 'Per Minute';
      case 'hour': return 'Per Hour';
      case 'project': return 'Per Project';
      default: return 'Per Project';
    }
  };

  return (
    <>
      <Popup
        visible={visible}
        onMaskClick={handleCancel}
        onClose={handleCancel}
        bodyStyle={{
          height: "89vh",
          borderTopLeftRadius: "16px",
          borderTopRightRadius: "16px",
          overflow: 'hidden'
        }}
      >
        <div style={{ height: '100%', overflow: 'hidden' }}>
          <div style={{
            padding: '12px',
            borderBottom: '1px solid #f0f0f0',
            background: 'white',
            position: 'sticky',
            top: 0,
            zIndex: 1000
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>
                  {mode === "edit" 
                    ? (userRole === "agent" ? "Edit Agent Profile" : "Edit Consultant")
                    : (userRole === "agent" ? "Add New Agent" : "Add New Consultant")}
                </div>
              </div>
              <Button
                fill="none"
                size="small"
                onClick={handleCancel}
                style={{ color: '#666', padding: '8px' }}
              >
                <CloseOutline style={{ fontSize: 18 }} />
              </Button>
            </div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
              {mode === "edit" 
                ? (userRole === "agent" ? "Update your agent profile" : "Update your consultant profile")
                : (userRole === "agent" ? "Complete all required fields for agent registration" : "Complete all required fields")}
            </div>
          </div>

          <div style={{
            height: 'calc(100% - 140px)',
            overflow: 'auto',
            padding: '8px 6px 16px'
          }}>
            <div
              className="consultant-form-scroll-container"
              style={{
                height: "100%",
                overflowY: "auto",
                overflowX: "hidden",
                WebkitOverflowScrolling: "touch",
                scrollBehavior: "smooth"
              }}
              onWheel={(e) => {
                e.stopPropagation();
              }}
              onTouchMove={(e) => {
                e.stopPropagation();
              }}
            >
              <Form
                form={form}
                layout="vertical"
                footer={null}
                style={{ width: '100%' }}
                onFinish={() => { }}
              >
                <Section title="Profile Photo" icon="👤">
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
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImageFile(null); setPreviewImage(null); }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <ImageUploader
                        value={imageFile ? [imageFile] : []}
                        onChange={(files) => {
                          if (files.length > 0) {
                            handleImageUpload(files[0]);
                          }
                        }}
                        upload={handleImageUpload}
                        maxCount={1}
                        onDelete={() => {
                          setImageFile(null);
                          setPreviewImage(null);
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
                </Section>

                <Section title="Personal Information" icon="👤">
                  <Space direction="vertical" block style={{ '--gap': '12px', width: '100%' }}>
                    <Form.Item
                      name="name"
                      label="Full Name"
                      rules={[{ required: true, message: "Please enter full name" }]}
                      style={{ width: '100%' }}
                    >
                      <Input
                        placeholder="Enter full name"
                        clearable
                        style={{ width: '100%' }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } }}
                      />
                    </Form.Item>

                    <Form.Item
                      name="phone"
                      label="Phone Number"
                      rules={[
                        { required: true, message: "Please enter phone number" },
                        { pattern: /^[0-9]{10}$/, message: "10 digits required" }
                      ]}
                      style={{ width: '100%' }}
                    >
                      <Input
                        type="tel"
                        maxLength={10}
                        placeholder="10-digit number"
                        clearable
                        style={{ width: '100%' }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } }}
                      />
                    </Form.Item>

                    <Form.Item
                      name="designation"
                      label="Designation"
                      rules={[{ required: true, message: "Please enter designation" }]}
                      style={{ width: '100%' }}
                    >
                      <>
                        <Input
                          placeholder="e.g., Senior Consultant"
                          value={designationInput ?? ""}
                          onChange={(val) => {
                            setDesignationInput(val ?? "");
                            form.setFieldValue("designation", val ?? "");
                          }}
                          clearable
                          style={{ width: '100%' }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } }}
                        />

                        <div
                          style={{
                            marginTop: "8px",
                            display: "grid",
                            gridTemplateColumns: "repeat(2, 1fr)",
                            gap: "8px",
                            width: '100%'
                          }}
                        >
                          {DESIGNATION_SUGGESTIONS
                            .filter((d) =>
                              d.toLowerCase().includes((designationInput || "").toLowerCase())
                            )
                            .slice(0, 6)
                            .map((d) => (
                              <div
                                key={d}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDesignationInput(d); form.setFieldValue("designation", d); }}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setDesignationInput(d); form.setFieldValue("designation", d); } }}
                                style={{
                                  padding: "8px 12px",
                                  borderRadius: "16px",
                                  border: "1px solid #ccc",
                                  backgroundColor: "#f5f5f5",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  textAlign: "center",
                                  wordBreak: "break-word",
                                  whiteSpace: "normal",
                                  lineHeight: "1.2"
                                }}
                              >
                                {d}
                              </div>
                            ))}
                        </div>
                      </>
                    </Form.Item>
                  </Space>
                </Section>

                {/* ✅ FIXED: Location Section - Optimized for Mobile Keyboard */}
                <Section title="Location" icon="📍">
                  <Space direction="vertical" block style={{ '--gap': '12px', width: '100%' }}>
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
                    </div>

                    {/* Address Field - FIXED */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px', fontWeight: '500' }}>
                        Address (Optional)
                      </div>
                      <Form.Item name="address" style={{ marginBottom: 0 }}>
                        <TextArea
                          placeholder="Full street address"
                          rows={2}
                          maxLength={200}
                          showCount
                        />
                      </Form.Item>
                    </div>

                    {/* Locality/Area Input - FIXED VERSION */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px', fontWeight: '500' }}>
                        Locality/Area {suggestionsLoading && "⏳"}
                      </div>
                      <div style={{ position: 'relative' }} className="location-suggestions-container">
                        <Form.Item
                          name="locality"
                          rules={[{ required: true, message: 'Please enter locality' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Input
                            placeholder="Type locality, area, city... (min 2 chars)"
                            onChange={(value) => {
                              if (debounceTimeoutRef.current) {
                                clearTimeout(debounceTimeoutRef.current);
                              }
                              debounceTimeoutRef.current = setTimeout(() => {
                                if (value && value.trim().length >= 2) {
                                  setSuggestionsLoading(true);
                                  setShowSuggestions(true);
                                  fetchLocationSuggestions(value.trim());
                                } else {
                                  setShowSuggestions(false);
                                }
                              }, 500);
                            }}
                            onFocus={() => {
                              const currentValue = form.getFieldValue('locality') || '';
                              if (currentValue.length >= 2 && locationSuggestions.length > 0) {
                                setShowSuggestions(true);
                              }
                            }}
                            clearable
                          />
                        </Form.Item>
                        
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
                            🔄
                          </div>
                        )}
                        
                        {showSuggestions && locationSuggestions.length > 0 && (
                          <div 
                            style={{
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
                            }}
                          >
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
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleSuggestionSelect(suggestion);
                                }}
                                style={{
                                  cursor: 'pointer',
                                  padding: '12px 16px',
                                  borderBottom: '1px solid #f0f0f0',
                                  fontSize: '14px',
                                  transition: 'background-color 0.2s',
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
                          </div>
                        )}
                      </div>
                    </div>

                    {/* City, State, Pincode - FIXED */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {/* City Field */}
                        <div style={{ flex: 1, minWidth: '100px' }}>
                          <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px', fontWeight: '500' }}>
                            City
                          </div>
                          <Form.Item
                            name="city"
                            rules={[{ required: true, message: 'Please enter city' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <Input
                              placeholder="City"
                              onBlur={(e) => {
                                if (e.target.value.trim()) {
                                  detectStateFromCity(e.target.value);
                                }
                              }}
                            />
                          </Form.Item>
                        </div>

                        {/* State Field */}
                        <div style={{ flex: 1, minWidth: '100px' }}>
                          <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px', fontWeight: '500' }}>
                            State
                          </div>
                          <Form.Item
                            name="state"
                            rules={[{ required: true, message: 'Please enter state' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <Input
                              placeholder="State"
                            />
                          </Form.Item>
                        </div>

                        {/* Pincode Field */}
                        <div style={{ flex: 1, minWidth: '100px' }}>
                          <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px', fontWeight: '500' }}>
                            Pincode
                          </div>
                          <Form.Item
                            name="pincode"
                            rules={[{ required: true, message: 'Please enter pincode' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <Input
                              placeholder="Pincode"
                              type="number"
                            />
                          </Form.Item>
                        </div>
                      </div>
                    </div>
                  </Space>
                </Section>

                <Section title="Consultation Details" icon="💰">
                  <Space direction="vertical" block style={{ '--gap': '16px', width: '100%' }}>
                    <div style={{ width: '100%' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#333' }}>
                        Consultation Fee {!feeAmount && "❌"}
                      </div>
                      <Counter
                        value={feeAmount}
                        onIncrement={incrementFee}
                        onDecrement={decrementFee}
                        label="Fee Amount"
                        unit="₹"
                      />
                    </div>

                    <div style={{ width: '100%' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#333' }}>
                        Fee Type {selectedMoneyType.length === 0 && "❌"}
                      </div>
                      <Selector
                        options={MONEY_TYPE_OPTIONS}
                        value={selectedMoneyType}
                        onChange={(val) => { setSelectedMoneyType(val); }}
                        multiple={false}
                        style={{
                          '--border-radius': '8px',
                          '--border': '1px solid #e0e0e0',
                          '--checked-border': '1px solid #1677ff',
                          width: '100%'
                        }}
                        columns={3}
                      />
                    </div>

                    <div style={{
                      padding: '12px',
                      backgroundColor: '#f0f8ff',
                      borderRadius: '8px',
                      textAlign: 'center',
                      width: '100%'
                    }}>
                      <span style={{ fontSize: 13, color: '#1677ff', fontWeight: '500' }}>
                        💰 {feeAmount}₹ {getMoneyTypeDisplay()}
                      </span>
                    </div>
                  </Space>
                </Section>

                <Section title="Professional Details" icon="💼">
                  <Space direction="vertical" block style={{ '--gap': '16px', width: '100%' }}>
                    <div style={{ width: '100%' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#333' }}>
                        Experience Level {!selectedExperience && "❌"}
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '8px',
                        width: '100%'
                      }}>
                        {EXPERIENCE_LEVELS.map((level) => (
                          <Chip
                            key={level.value}
                            label={level.label}
                            selected={selectedExperience === level.value}
                            onToggle={() => toggleExperience(level.value)}
                          />
                        ))}
                      </div>
                    </div>

                    <div style={{ width: '100%' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#333' }}>
                        Area of Expertise ({selectedExpertise.length} selected) {selectedExpertise.length === 0 && "❌"}
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '8px',
                        width: '100%'
                      }}>
                        {EXPERTISE_AREAS.map((expertise) => (
                          <Chip
                            key={expertise}
                            label={expertise}
                            selected={selectedExpertise.includes(expertise)}
                            onToggle={() => toggleExpertise(expertise)}
                          />
                        ))}
                      </div>
                    </div>

                    <div style={{ width: '100%' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#333' }}>
                        Languages Spoken ({selectedLanguages.length} selected)
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '8px',
                        width: '100%'
                      }}>
                        {COMMON_LANGUAGES.map((language) => (
                          <Chip
                            key={language}
                            label={language}
                            selected={selectedLanguages.includes(language)}
                            onToggle={() => toggleLanguage(language)}
                          />
                        ))}
                      </div>
                    </div>

                    <Form.Item name="certifications" label="Certifications" style={{ width: '100%' }}>
                      <TextArea
                        placeholder="List certifications, degrees, or qualifications..."
                        rows={2}
                        maxLength={300}
                        showCount
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Space>
                </Section>

                <Section title="Documents & Verification" icon="📄">
                  <Space direction="vertical" block style={{ '--gap': '16px', width: '100%' }}>
                    <div style={{ width: '100%' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#333' }}>
                        ID Proof Document {!idProofFile && "❌"}
                      </div>
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
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIdProofFile(null); setIdProofPreview(null); }}
                          >
                            Remove ID
                          </Button>
                        </div>
                      ) : (
                        <div style={{ position: 'relative', width: '100%' }}>
                          <input
                            type="file"
                            accept="image/*"
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              opacity: 0,
                              cursor: 'pointer',
                              zIndex: 2
                            }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleIdProofUpload(file);
                              }
                            }}
                          />
                          <div
                            style={{
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
                            }}
                          >
                            <span style={{ fontSize: 24 }}>🆔</span>
                            <span>Tap to upload ID Proof</span>
                            <span style={{ fontSize: 11, color: '#999', textAlign: 'center' }}>
                              Aadhaar, PAN, or Government ID
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </Space>
                </Section>
              </Form>
            </div>
          </div>

          <div style={{
            padding: '10px',
            background: 'white',
            borderTop: '1px solid #f0f0f0',
            position: 'sticky',
            bottom: 0
          }}>
            <Button
              block
              color="primary"
              size="large"
              loading={loading}
              style={{ borderRadius: '8px' }}
              onClick={handleSubmit}
            >
              {loading
                ? (mode === "edit" ? "Updating..." : "Adding...")
                : (mode === "edit" ? "Update Consultant" : "Add Consultant")}
            </Button>
          </div>
        </div>
      </Popup>

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

      <style jsx>{`
        /* Critical fixes for mobile keyboard */
        .adm-input, .adm-text-area {
          -webkit-user-select: text !important;
          user-select: text !important;
          -webkit-user-modify: read-write !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        
        .adm-input-element, .adm-text-area-element {
          -webkit-user-select: text !important;
          user-select: text !important;
          caret-color: #1677ff !important;
        }
        
        /* Prevent zoom on iOS */
        @media screen and (max-width: 768px) {
          input, textarea, select {
            font-size: 16px !important;
          }
        }
        
        /* Improve scrolling */
        .consultant-form-scroll-container {
          -webkit-overflow-scrolling: touch;
          transform: translateZ(0);
        }
        
        /* Fix for suggestion clicks */
        .location-suggestions-container * {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
    </>
  );
}