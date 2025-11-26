import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authReducer from './authSlice';
import appReducer from './appSlice';

// Persist config for auth slice (we want to persist auth state)
const authPersistConfig = {
  key: 'auth',
  storage: AsyncStorage,
  whitelist: ['user', 'token', 'refreshToken', 'isAuthenticated'], // Only persist these fields
};

// Persist config for app slice (we don't want to persist reload triggers and loading states)
const appPersistConfig = {
  key: 'app',
  storage: AsyncStorage,
  whitelist: ['currentScreen'], // Only persist current screen
};

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);
const persistedAppReducer = persistReducer(appPersistConfig, appReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    app: persistedAppReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;