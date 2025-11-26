import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Types
interface AppState {
  // Reload triggers for different screens
  homeReloadTrigger: number;
  propertyListingReloadTrigger: number;
  bookConsultantReloadTrigger: number;
  managementReloadTrigger: number;

  // Loading states
  isHomeLoading: boolean;
  isPropertyListingLoading: boolean;
  isBookConsultantLoading: boolean;
  isManagementLoading: boolean;

  // Error states
  homeError: string | null;
  propertyListingError: string | null;
  bookConsultantError: string | null;
  managementError: string | null;

  // Current navigation state
  currentScreen: string;
}

// Initial state
const initialState: AppState = {
  homeReloadTrigger: 0,
  propertyListingReloadTrigger: 0,
  bookConsultantReloadTrigger: 0,
  managementReloadTrigger: 0,

  isHomeLoading: false,
  isPropertyListingLoading: false,
  isBookConsultantLoading: false,
  isManagementLoading: false,

  homeError: null,
  propertyListingError: null,
  bookConsultantError: null,
  managementError: null,

  currentScreen: 'home',
};

// Slice
const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    // Reload triggers
    triggerHomeReload: (state) => {
      state.homeReloadTrigger += 1;
    },
    triggerPropertyListingReload: (state) => {
      state.propertyListingReloadTrigger += 1;
    },
    triggerBookConsultantReload: (state) => {
      state.bookConsultantReloadTrigger += 1;
    },
    triggerManagementReload: (state) => {
      state.managementReloadTrigger += 1;
    },

    // Loading states
    setHomeLoading: (state, action: PayloadAction<boolean>) => {
      state.isHomeLoading = action.payload;
    },
    setPropertyListingLoading: (state, action: PayloadAction<boolean>) => {
      state.isPropertyListingLoading = action.payload;
    },
    setBookConsultantLoading: (state, action: PayloadAction<boolean>) => {
      state.isBookConsultantLoading = action.payload;
    },
    setManagementLoading: (state, action: PayloadAction<boolean>) => {
      state.isManagementLoading = action.payload;
    },

    // Error states
    setHomeError: (state, action: PayloadAction<string | null>) => {
      state.homeError = action.payload;
    },
    setPropertyListingError: (state, action: PayloadAction<string | null>) => {
      state.propertyListingError = action.payload;
    },
    setBookConsultantError: (state, action: PayloadAction<string | null>) => {
      state.bookConsultantError = action.payload;
    },
    setManagementError: (state, action: PayloadAction<string | null>) => {
      state.managementError = action.payload;
    },

    // Navigation
    setCurrentScreen: (state, action: PayloadAction<string>) => {
      state.currentScreen = action.payload;
    },

    // Clear all errors
    clearAllErrors: (state) => {
      state.homeError = null;
      state.propertyListingError = null;
      state.bookConsultantError = null;
      state.managementError = null;
    },

    // Reset all reload triggers
    resetAllReloadTriggers: (state) => {
      state.homeReloadTrigger = 0;
      state.propertyListingReloadTrigger = 0;
      state.bookConsultantReloadTrigger = 0;
      state.managementReloadTrigger = 0;
    },
  },
});

export const {
  triggerHomeReload,
  triggerPropertyListingReload,
  triggerBookConsultantReload,
  triggerManagementReload,
  setHomeLoading,
  setPropertyListingLoading,
  setBookConsultantLoading,
  setManagementLoading,
  setHomeError,
  setPropertyListingError,
  setBookConsultantError,
  setManagementError,
  setCurrentScreen,
  clearAllErrors,
  resetAllReloadTriggers,
} = appSlice.actions;

export default appSlice.reducer;