// hooks/useConsultants.js
import { useState, useEffect } from 'react';
import { getConsultants } from '../services/consultants';
import { Toast } from 'antd-mobile';

export const useConsultants = () => {
  const [consultants, setConsultants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Format languages to show max 3 languages (first 3 letters each)
  const formatLanguages = (languages) => {
    console.log("Raw languages data:", languages, typeof languages);
    
    if (!languages || languages.length === 0) return ['ENG'];
    
    let languageArray = [];
    
    if (Array.isArray(languages)) {
      languageArray = languages
        .filter(lang => lang && lang.trim().length > 0)
        .map(lang => {
          if (typeof lang === 'string') {
            return lang.trim();
          }
          return String(lang).trim();
        });
    } else if (typeof languages === 'string') {
      const cleanString = languages.replace(/[\[\]"]/g, '').trim();
      languageArray = cleanString.split(',').map(lang => lang.trim()).filter(lang => lang);
    }
    
    console.log("Cleaned languages array:", languageArray);
    
    if (languageArray.length === 0) return ['ENG'];
    
    const formatted = languageArray.slice(0, 3).map(lang => {
      const cleanLang = lang.replace(/[^a-zA-Z]/g, '');
      return cleanLang.substring(0, 3).toUpperCase();
    }).filter(lang => lang.length > 0);
    
    console.log("Final formatted languages:", formatted);
    return formatted;
  };

  // Use the same image URL resolver as in the main component
  const getSafeImageUrl = (image) => {
    if (!image) return "/fallback.png";
    
    // If it's already a full URL, return as is
    if (image.startsWith('http')) {
      return image;
    }
    
    // Remove leading slash if present
    const cleanImage = image.replace(/^\//, '');
    
    // Use environment variables with fallbacks
    const baseUrl = process.env.REACT_APP_UPLOADS_URL_LAN || 'http://192.168.29.78:5000';
    
    return `${baseUrl}/${cleanImage}`;
  };

  const fetchConsultants = async () => {
    try {
      setLoading(true);
      const result = await getConsultants();
      console.log("API Response:", result);
      
      if (result.success) {
        const consultantsData = result.data?.data || result.data || [];
        console.log("Raw consultants data:", consultantsData);
        
        const enhancedConsultants = consultantsData.map(consultant => {
          const formattedLanguages = formatLanguages(consultant.languages);
          
          const enhanced = {
            ...consultant,
            name: consultant.name || 'Consultant',
            type: consultant.designation || 'Real Estate Consultant',
            languages: formattedLanguages,
            consultationFee: consultant.money || '500',
            consultationTime: consultant.moneyType === 'minute' ? 'min' : 
                             consultant.moneyType === 'hour' ? 'hour' : 'project',
            experience: consultant.experience || 0,
            image: getSafeImageUrl(consultant.image),
            location: consultant.location || 'City not specified'
          };
          
          console.log("Enhanced consultant:", {
            name: enhanced.name,
            image: enhanced.image,
            moneyType: consultant.moneyType,
            formattedLanguages: enhanced.languages
          });
          return enhanced;
        });
        
        setConsultants(enhancedConsultants);
        return enhancedConsultants;
      } else {
        Toast.show(result.error || "Failed to fetch consultants");
        return [];
      }
    } catch (error) {
      console.error("Error fetching consultants:", error);
      Toast.show("Error loading consultants");
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultants();
  }, []);

  return {
    consultants,
    loading,
    refreshConsultants: fetchConsultants
  };
};