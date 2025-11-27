import React, { useRef, useState, useEffect } from "react";
import {
  Alert,
  Platform,
  StatusBar,
  View,
  ActivityIndicator,
  Text,
  BackHandler,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";

// ==================== Token Management ====================
const getToken = async () => await AsyncStorage.getItem("authToken");
const getRefreshToken = async () => await AsyncStorage.getItem("refreshToken");
const setTokens = async (access: string, refresh: string) => {
  await AsyncStorage.setItem("authToken", access);
  await AsyncStorage.setItem("refreshToken", refresh);
};
const clearTokens = async () => {
  await AsyncStorage.multiRemove(["authToken", "refreshToken", "user"]);
};

// ==================== API Setup ====================
const API_URL = "https://my-pro-backend.vercel.app/api";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// ===== Interceptors =====
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          addSubscriber((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;
      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) throw new Error("No refresh token found");

        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = data;
        await setTokens(accessToken, newRefresh);

        axios.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
        onRefreshed(accessToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (err) {
        console.error("🔒 Refresh token failed:", err.message);
        await clearTokens();
        Alert.alert("Session expired", "Please login again.");
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

// ==================== Cache Buster (set once on app start) ====================
const CACHE_BUSTER = `_t=${Date.now()}`;

// ==================== Type Definitions ====================
type WebViewMessage =
  | { type: "REQUEST_LOCATION" }
  | { type: "REVERSE_GEOCODE"; payload: { query: string } }
  | { type: "SET_TOKEN"; token: string }
  | { type: "REFRESH_TOKEN" }
  | { type: "NAVIGATION_STATE"; payload: { 
      canGoBack: boolean; 
      currentPath: string;
      isMainTab: boolean;
    } };

type LocationData = {
  addressLine1: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  latitude: number;
  longitude: number;
};
type Suggestion = {
  id: string;
  display_name: string;
  address: {
    name: string;
    road: string;
    suburb: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    latitude: string;
    longitude: string;
  };
};

// ==================== Main App ====================
export default function App(): JSX.Element {
  const webViewRef = useRef<WebView>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const locationDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [isWebViewLoading, setIsWebViewLoading] = useState<boolean>(true);
  const ongoingRequestRef = useRef<{ abort: () => void } | null>(null);

  // ✅ Enhanced back button tracking
  const canGoBackRef = useRef(false);
  const currentPathRef = useRef("/home");
  const isMainTabRef = useRef(true);
  const tabRoutes = useRef(["/home", "/BookConsultant", "/PropertyListing", "/Management"]);
  
  // ✅ Track if we're already showing exit modal to prevent multiple modals
  const isExitModalShowingRef = useRef(false);

  // ✅ Web URL configuration
  const WEB_URL = "https://my-proparti.vercel.app";
  // ✅ Simplified Android Back Button Handler
  useEffect(() => {
    if (Platform.OS === "android") {
      const handleBackPress = () => {
        console.log("🔙 Back button pressed:", {
          currentPath: currentPathRef.current,
          isMainTab: isMainTabRef.current
        });

        // If we're already showing exit modal, don't show another one
        if (isExitModalShowingRef.current) {
          return true;
        }

        // If we're on home tab, show exit confirmation
        if (currentPathRef.current === "/home" || currentPathRef.current === "/") {
          isExitModalShowingRef.current = true;
          Alert.alert(
            "Exit App", 
            "Are you sure you want to exit?",
            [
              { 
                text: "Cancel", 
                style: "cancel",
                onPress: () => {
                  isExitModalShowingRef.current = false;
                }
              },
              { 
                text: "Exit", 
                onPress: () => {
                  isExitModalShowingRef.current = false;
                  BackHandler.exitApp();
                }
              },
            ],
            {
              onDismiss: () => {
                isExitModalShowingRef.current = false;
              }
            }
          );
          return true;
        }
        
        // For ANY other tab or page, navigate to home
        sendToWebView("NAVIGATE_TO", { path: "/home" });
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBackPress
      );

      return () => subscription.remove();
    }
  }, []);

  // ✅ Track WebView navigation state and current path
  const handleNavigationChange = (navState: any) => {
    canGoBackRef.current = navState.canGoBack;
    
    // Extract current path from URL
    if (navState.url) {
      try {
        const url = new URL(navState.url);
        currentPathRef.current = url.pathname;
        isMainTabRef.current = tabRoutes.current.includes(currentPathRef.current);
        console.log("📍 Current path:", currentPathRef.current, "Main tab:", isMainTabRef.current);
      } catch (error) {
        console.log("⚠️ Could not parse URL:", navState.url);
      }
    }
  };

  // Pre-request location permission
  useEffect(() => {
    const preRequest = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === "undetermined") {
          await Location.requestForegroundPermissionsAsync();
        }
      } catch (error) {
        console.log("Permission pre-check failed:", error);
      }
    };
    preRequest();
  }, []);

  // ==================== Handle WebView Messages ====================
const handleWebViewMessage = async (event: WebViewMessageEvent) => {
  try {
    const data = JSON.parse(event.nativeEvent.data);

    switch (data.type) {
      case "REQUEST_LOCATION":
        fetchCurrentLocation();
        break;

      case "REVERSE_GEOCODE":
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        if (ongoingRequestRef.current) {
          ongoingRequestRef.current.abort();
          ongoingRequestRef.current = null;
        }
        debounceTimeoutRef.current = setTimeout(() => {
          fetchLocationSuggestions(data.payload.query);
        }, 300);
        break;

      // ✅ FIXED — Handle camera requests with proper uploadType
      case "OPEN_CAMERA":
        console.log("📸 Camera request received:", data.payload);
        await openImagePicker("camera", data.payload?.uploadType || "profile");
        break;

      // ✅ FIXED — Handle gallery requests with proper uploadType  
      case "OPEN_GALLERY":
        console.log("🖼️ Gallery request received:", data.payload);
        await openImagePicker("gallery", data.payload?.uploadType || "profile");
        break;

      case "SET_TOKEN":
        await AsyncStorage.setItem("authToken", data.token);
        console.log("✅ Token saved from WebView");
        break;

      case "REFRESH_TOKEN":
        await handleTokenRefresh();
        break;
case "TEST_MESSAGE":
  console.log("✅ TEST MESSAGE RECEIVED FROM WEBVIEW");
  break;

      case "NAVIGATION_STATE":
        canGoBackRef.current = data.payload.canGoBack;
        currentPathRef.current = data.payload.currentPath;
        isMainTabRef.current = data.payload.isMainTab;
        break;
    }
  } catch (err) {
    console.warn("Invalid message from WebView:", err);
  }
};

// ✅ UPDATED — Improved image picker function
// ✅ ENHANCED — Improved image picker function with better error handling
const openImagePicker = async (mode: "camera" | "gallery", uploadType: string = "profile") => {
  try {
    console.log(`🔄 Starting image picker: ${mode} for ${uploadType}`);
    
    let result;

    // Request permissions first
    if (mode === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera access is needed to take pictures.");
        
        // Send error message to WebView
        webViewRef.current?.postMessage(JSON.stringify({
          type: "IMAGE_SELECTION_ERROR",
          payload: { 
            error: "Camera permission denied",
            uploadType 
          }
        }));
        return;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Gallery access is needed to pick images.");
        
        // Send error message to WebView
        webViewRef.current?.postMessage(JSON.stringify({
          type: "IMAGE_SELECTION_ERROR",
          payload: { 
            error: "Gallery permission denied",
            uploadType 
          }
        }));
        return;
      }
    }

    // Launch camera or gallery with enhanced options
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
      base64: true,
      exif: false,
    };

    if (mode === "camera") {
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    console.log("📷 Image picker result:", {
      canceled: result.canceled,
      assetsCount: result.assets?.length,
      uploadType
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const image = result.assets[0];
      
      // Generate a proper filename
      const timestamp = Date.now();
      const fileExtension = image.uri.split('.').pop() || 'jpg';
      const fileName = `${uploadType}_${timestamp}.${fileExtension}`;
      
      // Prepare the image data to send back to WebView
      const payload = {
        type: "IMAGE_SELECTED",
        payload: {
          base64: image.base64,
          uri: image.uri,
          fileName: fileName,
          fileSize: image.fileSize,
          width: image.width,
          height: image.height,
          mimeType: `image/${fileExtension === 'png' ? 'png' : 'jpeg'}`,
          uploadType: uploadType, // 'profile' or 'idProof'
        },
      };

      console.log("✅ Sending image to WebView:", {
        type: payload.type,
        uploadType: payload.payload.uploadType,
        hasBase64: !!payload.payload.base64,
        fileName: payload.payload.fileName,
        fileSize: payload.payload.fileSize
      });

      // Send the image data back to WebView
      webViewRef.current?.postMessage(JSON.stringify(payload));
    } else {
      console.log("❌ Image selection was cancelled");
      // Send cancellation message
      webViewRef.current?.postMessage(JSON.stringify({
        type: "IMAGE_SELECTION_CANCELLED",
        payload: { uploadType }
      }));
    }
  } catch (err: any) {
    console.error("🚨 Image picker error:", err);
    // Send error message to WebView
    webViewRef.current?.postMessage(JSON.stringify({
      type: "IMAGE_SELECTION_ERROR",
      payload: { 
        error: err.message || "Unknown error occurred",
        uploadType 
      }
    }));
  }
};
  // ==================== Token Refresh ====================
  const handleTokenRefresh = async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) throw new Error("No refresh token available");

      const { data } = await api.post("/auth/refresh", { refreshToken });
      const { accessToken, refreshToken: newRefresh } = data;
      await setTokens(accessToken, newRefresh);

      sendToWebView("TOKEN_UPDATED", { accessToken });
      console.log("✅ Tokens refreshed successfully");
    } catch (err) {
      console.error("❌ Token refresh failed:", err);
      await clearTokens();
      sendToWebView("TOKEN_EXPIRED", {});
    }
  };

  // ==================== Location Functions ====================
  const fetchCurrentLocation = async () => {
    // ✅ Debounce location requests - prevent rapid repeated calls
    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    
    locationDebounceRef.current = setTimeout(async () => {
      try {
        sendToWebView("LOCATION_LOADING", { status: "fetching" });
        
        // Check permission first without requesting
        const { status: currentStatus } = await Location.getForegroundPermissionsAsync();
        let status = currentStatus;
      
      // Only request if undetermined
      if (status === "undetermined") {
        const { status: requestStatus } = await Location.requestForegroundPermissionsAsync();
        status = requestStatus;
      }
      
      if (status !== "granted") {
        Alert.alert("Location Denied", "Enable location access in Settings and retry.");
        sendToWebView("LOCATION_ERROR", { error: "Permission denied" });
        return;
      }

      // First, try to get last known location (instant)
      const lastLocation = await Location.getLastKnownPositionAsync();
      if (lastLocation) {
        const { latitude, longitude } = lastLocation.coords;
        console.log("📍 Using cached location");
        sendToWebView("LOCATION_COORDS", { latitude, longitude });
        reverseGeocodeCoordinates(latitude, longitude);
        // Refresh in background without blocking
        refreshLocationInBackground();
      } else {
        // No cached location, get fresh one
        getAndSendFreshLocation();
      }
      } catch (err: any) {
        console.error("Error fetching location:", err);
        sendToWebView("LOCATION_ERROR", { error: err.message });
      }
      }, 500); // ✅ Wait 500ms before fetching to avoid duplicate requests
      };

  const getAndSendFreshLocation = async () => {
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Lowest,
        timeout: 3000,
      });
      const { latitude, longitude } = position.coords;
      console.log("📍 Got fresh location");
      sendToWebView("LOCATION_COORDS", { latitude, longitude });
      reverseGeocodeCoordinates(latitude, longitude);
    } catch (err: any) {
      console.error("Error getting fresh location:", err);
    }
  };

  const refreshLocationInBackground = async () => {
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Lowest,
        timeout: 3000,
      });
      const { latitude, longitude } = position.coords;
      console.log("📍 Refreshed location in background");
      reverseGeocodeCoordinates(latitude, longitude);
    } catch (err: any) {
      console.error("Background location refresh failed:", err);
    }
  };

  const reverseGeocodeCoordinates = async (latitude: number, longitude: number) => {
    try {
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      const locality = address.suburb || address.district || "";
      const city = address.city || address.district || "";
      const state = address.region || "";
      const pincode = address.postalCode || "";
      const addressLine1 = [address.name, address.street, locality]
        .filter(Boolean)
        .join(", ");
      const locationData: LocationData = {
        addressLine1,
        locality,
        city,
        state,
        pincode,
        country: address.country || "India",
        latitude,
        longitude,
      };
      console.log("🔄 Sending LOCATION_UPDATE to WebView:", locationData);
      sendToWebView("LOCATION_UPDATE", locationData);
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
    }
  };

  // ==================== Suggestions ====================
  const fetchLocationSuggestions = async (query: string) => {
    try {
      if (!query || query.trim().length < 2) {
        sendSuggestionsToWebView([]);
        return;
      }
      const suggestions = await fetchNominatimSuggestions(query.trim());
      sendSuggestionsToWebView(suggestions);
    } catch (error) {
      console.error("Suggestion fetch failed:", error);
      sendSuggestionsToWebView([]);
    } finally {
      ongoingRequestRef.current = null;
    }
  };

  const fetchNominatimSuggestions = async (query: string): Promise<Suggestion[]> => {
  if (ongoingRequestRef.current) ongoingRequestRef.current.abort();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  ongoingRequestRef.current = { abort: () => controller.abort() };

  try {
    // Enhanced URL with proper parameters
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      `${query}, India`
    )}&addressdetails=1&limit=8&countrycodes=in&accept-language=en`;

    const res = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PropertyApp/1.0'
      }
    });
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const text = await res.text();
    
    // Check if response is HTML (starts with <) instead of JSON
    if (text.trim().startsWith('<')) {
      console.warn('Nominatim returned HTML instead of JSON - likely rate limiting');
      return [];
    }
    
    if (!text.trim()) {
      return [];
    }
    
    const data = JSON.parse(text);
    
    if (!Array.isArray(data)) {
      console.warn('Nominatim returned non-array response:', typeof data);
      return [];
    }
    
    ongoingRequestRef.current = null;
    
    return data.map((item, idx) => ({
      id: `nom_${item.place_id || idx}_${Date.now()}`,
      display_name: item.display_name,
      address: {
        name: item.address?.suburb || item.address?.village || item.address?.neighbourhood || "Location",
        road: item.address?.road || "",
        suburb: item.address?.suburb || "",
        city: item.address?.city || item.address?.town || item.address?.county || "",
        state: item.address?.state || "",
        pincode: item.address?.postcode || "",
        country: item.address?.country || "India",
        latitude: item.lat,
        longitude: item.lon,
      },
    }));
  } catch (e: any) {
    // Don't log AbortError - it's expected behavior during rapid typing
    if (e.name !== 'AbortError') {
      console.error("Nominatim API error:", e);
    }
    return [];
  } finally {
    clearTimeout(timeoutId);
    ongoingRequestRef.current = null;
  }
};


  // ==================== Communication ====================
  const sendToWebView = (type: string, payload: unknown) => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({ type, payload }));
    }
  };
  const sendSuggestionsToWebView = (suggestions: Suggestion[]) => {
    sendToWebView("LOCATION_SUGGESTIONS", { suggestions });
  };

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
      if (ongoingRequestRef.current) ongoingRequestRef.current.abort();
    };
  }, []);

  // ==================== Render ====================
  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{
          flex: 1,
          marginTop: Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0,
        }}
      >
       <WebView
  ref={webViewRef}
  source={{ uri: WEB_URL }}
  javaScriptEnabled
  domStorageEnabled
  mixedContentMode="always"
  originWhitelist={["*"]}
  onMessage={handleWebViewMessage}
  onNavigationStateChange={handleNavigationChange}
  onLoadStart={() => setIsWebViewLoading(true)}
  onLoadEnd={() => setIsWebViewLoading(false)}
  startInLoadingState
  // ✅ WebView Performance Optimizations
  cacheEnabled={false}
  cacheMode="LOAD_NO_CACHE"
  // ✅ Allow file uploads and camera access
  allowsInlineMediaPlayback
  mediaPlaybackRequiresUserAction={false}
  allowFileAccess
  allowUniversalAccessFromFileURLs
  allowFileAccessFromFileURLs
  renderLoading={() => (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
      }}
    >
      <ActivityIndicator size="large" color="#1890ff" />
      <Text style={{ marginTop: 12, fontSize: 14, color: "#666" }}>
        Loading Property App...
      </Text>
    </View>
  )}
  style={{ flex: 1 }}
/>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}