import api from "./axios";
// Fetch location suggestions based on text input
export const fetchLocationSuggestions = async (query) => {
  if (!query || query.trim().length < 2) return [];
  try {
    const { data } = await api.get("locations/suggest", {
      params: { query }
    });
    return data.suggestions || data || [];
  } catch (error) {
    console.error("Failed to fetch location suggestions:", error);
    return [];
  }
};
// Fetch location by coordinates (this should handle reverse geocoding too)
export const fetchCurrentLocation = async (lat, lon) => {
  try {
    const { data } = await api.get("locations/current", {
      params: { lat, lon }
    });
    return data;
  } catch (error) {
    console.error("Failed to fetch current location:", error);
    return null;
  }
};