// src/services/properties.js
import api from "./axios";

// Enhanced with timeout and abort controller support
const withTimeout = (promise, timeout = 30000) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), timeout);
  });
  return Promise.race([promise, timeoutPromise]);
};

export const getProperties = async (signal = null) => {
  try {
    const config = signal ? { signal } : {};
    const { data } = await withTimeout(api.get("/properties", config));
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
};

export const getPropertyById = async (id, signal = null) => {
  try {
    const config = signal ? { signal } : {};
    const response = await withTimeout(api.get(`/properties/${id}`, config));
    return response.data;
  } catch (error) {
    console.error('API Error fetching property:', error);
    return { 
      success: false, 
      error: error.response?.data?.message || 'Failed to fetch property' 
    };
  }
};

export const createProperty = async (propertyData, signal = null) => {
  try {
    const config = {
      headers: {
        "Content-Type": "multipart/form-data" 
      },
      timeout: 45000, // 45 seconds for file uploads
      ...(signal && { signal })
    };
    
    const { data } = await withTimeout(api.post("/properties", propertyData, config), 45000);
    return { success: true, data };
  } catch (error) {
    console.error('Create property error:', error);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
};

export const updateProperty = async (id, propertyData, signal = null) => {
  try {
    const config = {
      headers: {
        "Content-Type": "multipart/form-data"
      },
      timeout: 45000,
      ...(signal && { signal })
    };
    
    const { data } = await withTimeout(api.put(`/properties/${id}`, propertyData, config), 45000);
    return { success: true, data };
  } catch (error) {
    console.error('Update property error:', error);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
};

export const deleteProperty = async (id, signal = null) => {
  try {
    const config = signal ? { signal } : {};
    const { data } = await withTimeout(api.delete(`/properties/${id}`, config));
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
};

export const searchProperties = async (filters, signal = null) => {
  try {
    const config = signal ? { signal, params: filters } : { params: filters };
    const { data } = await withTimeout(api.get("/properties/search", config));
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
};

export const getFeaturedProperties = async (signal = null) => {
  try {
    const config = signal ? { signal } : {};
    const { data } = await withTimeout(api.get("/properties/featured", config));
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
};

export const toggleFavorite = async (propertyId, signal = null) => {
  try {
    const config = signal ? { signal } : {};
    const { data } = await withTimeout(api.post(`/properties/${propertyId}/favorite`, {}, config));
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
};

export const getFavoriteProperties = async (signal = null) => {
  try {
    const config = signal ? { signal } : {};
    const { data } = await withTimeout(api.get("/properties/favorites", config));
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
};

export const getOwnProperties = async (signal = null) => {
  try {
    const config = signal ? { signal } : {};
    const { data } = await withTimeout(api.get("/properties/my-properties", config));
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
};

export const approveProperty = async (propertyId, signal = null) => {
  try {
    const config = signal ? { signal } : {};
    const { data } = await withTimeout(api.put(`/properties/${propertyId}/approve`, {}, config));
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
};

export const rejectProperty = async (propertyId, rejectionMessage, signal = null) => {
  try {
    const config = signal ? { signal } : {};
    const { data } = await withTimeout(api.put(`/properties/${propertyId}/reject`, { rejectionMessage }, config));
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};