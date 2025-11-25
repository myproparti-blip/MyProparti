// store/index.js - Add these optimizations
import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: {
    // your reducers
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Disable for better performance
      immutableCheck: false,    // Disable for better performance
    }),
  devTools: process.env.NODE_ENV !== 'production',
});