import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  consultants: [],
  properties: [],
  agents: [],
  advertisements: [],
  userProfile: null,
  city: "Detecting...",
  isInitialized: false,
  lastUpdated: null,
};

const homeSlice = createSlice({
  name: 'home',
  initialState,
  reducers: {
    setHomeData: (state, action) => {
      const { consultants, properties, agents, advertisements, userProfile, city } = action.payload;
      if (consultants) state.consultants = consultants;
      if (properties) state.properties = properties;
      if (agents) state.agents = agents;
      if (advertisements) state.advertisements = advertisements;
      if (userProfile) state.userProfile = userProfile;
      if (city) state.city = city;
      state.isInitialized = true;
      state.lastUpdated = Date.now();
    },
    setConsultants: (state, action) => {
      state.consultants = action.payload;
    },
    setProperties: (state, action) => {
      state.properties = action.payload;
    },
    setAgents: (state, action) => {
      state.agents = action.payload;
    },
    setAdvertisements: (state, action) => {
      state.advertisements = action.payload;
    },
    setUserProfile: (state, action) => {
      state.userProfile = action.payload;
    },
    setCity: (state, action) => {
      state.city = action.payload;
    },
  },
});

export const { setHomeData, setConsultants, setProperties, setAgents, setAdvertisements, setUserProfile, setCity } = homeSlice.actions;

// Memoized selectors - prevent unnecessary re-renders
export const selectConsultants = (state) => state.home.consultants;
export const selectProperties = (state) => state.home.properties;
export const selectAdvertisements = (state) => state.home.advertisements;
export const selectUserProfile = (state) => state.home.userProfile;
export const selectCity = (state) => state.home.city;
export const selectIsInitialized = (state) => state.home.isInitialized;

export default homeSlice.reducer;
