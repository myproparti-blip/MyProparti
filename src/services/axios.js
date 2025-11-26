import axios from "axios";
import { Toast } from "antd-mobile";

const getToken = () => localStorage.getItem("authToken");
const setToken = (token) => localStorage.setItem("authToken", token);
const getRefreshToken = () => localStorage.getItem("refreshToken");

const PC_LAN_IP = "192.168.29.78";
const LAN_API = `http://${PC_LAN_IP}:5000/api`;

let API_URL;
const hostname = window.location.hostname;

if (hostname === "localhost") {
  API_URL = "http://localhost:5000/api";
} else if (
  hostname.startsWith("192.") ||
  hostname.startsWith("10.") ||
  hostname.startsWith("78.")
) {
  API_URL = LAN_API;
} else if (hostname.includes("vercel.app")) {
   API_URL = "my-pro-backend-7xjoaoycq-propartis-projects.vercel.app/api";
} else {
  API_URL = LAN_API;
}

// Request cache for GET requests - cache for 30 seconds
const requestCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

const getCacheKey = (config) => {
  return `${config.method.toUpperCase()}_${config.url}`;
};

const isCacheValid = (timestamp) => {
  return Date.now() - timestamp < CACHE_TTL;
};

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// ===== REQUEST INTERCEPTOR =====
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (config.data instanceof FormData) delete config.headers["Content-Type"];
    
    // Cache GET requests
    if (config.method === 'get') {
      const cacheKey = getCacheKey(config);
      const cached = requestCache.get(cacheKey);
      
      if (cached && isCacheValid(cached.timestamp)) {
        // Return cached response
        config.__useCache = cached.data;
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// ===== REFRESH TOKEN HANDLING =====
let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
  refreshQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token);
  });
  refreshQueue = [];
};

api.interceptors.response.use(
  (response) => {
    // Cache successful GET responses
    if (response.config.method === 'get') {
      const cacheKey = getCacheKey(response.config);
      requestCache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      });
    }
    return response;
  },
  async (error) => {
    // If we have cached data and request failed, return cached data
    if (error.config && error.config.method === 'get') {
      const cacheKey = getCacheKey(error.config);
      const cached = requestCache.get(cacheKey);
      
      if (cached) {
        console.log('Using cached response due to error');
        return cached.data;
      }
    }
    const originalRequest = error.config;
    const status = error.response?.status;

    // If unauthorized
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) throw new Error("No refresh token available");

        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = data;

        if (!accessToken || !newRefreshToken) throw new Error("Invalid token response");

        setToken(accessToken);
        localStorage.setItem("refreshToken", newRefreshToken);

        axios.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        isRefreshing = false;

        console.error("🔒 Token refresh failed:", err.message);

        // Avoid duplicate logout triggers
        if (!window.location.pathname.includes("/login")) {
          Toast.show({
            content: "Session expired. Please log in again.",
            icon: "fail",
          });
          localStorage.removeItem("authToken");
          localStorage.removeItem("refreshToken");
          setTimeout(() => (window.location.href = "/login"), 1200);
        }

        return Promise.reject(err);
      }
    }

    // Handle other errors
    if (status && status !== 401) {
      const message = error.response?.data?.message || "Something went wrong!";
      Toast.show({ content: message, icon: "fail" });
    }

    return Promise.reject(error);
  }
);

export default api;
