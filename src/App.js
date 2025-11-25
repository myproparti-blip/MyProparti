import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import { TabBar, Toast, DotLoading } from "antd-mobile";

import {
  AppOutline,
  UserOutline,
  UnorderedListOutline,
  SetOutline,
} from "antd-mobile-icons";
import "antd-mobile/es/global";
import { useSelector, useDispatch } from 'react-redux';
import { setLoggedIn, setLoading, logout } from './store/slices/authSlice';
import api from "./services/axios";

// ===== PAGES =====
import Home from "./pages/home";
import BookConsultant from "./pages/BookConsultant";
import PropertyListing from "./pages/PropertyListing";
import Login from "./pages/login";
import PostProperty from "./components/proparti/PostProperty";
import Management from "./pages/Management";
import MyProperties from "./components/proparti/MyProperties";
import PropertyDetails from "./components/proparti/PropertyDetails";
import Profile from "./components/profile/Profile";
import Favorites from "./components/profile/Favorites";
import MyConsultants from "./components/consultant/MyConsultants";
import MyAgents from "./components/proparti/agenData";

// ===== STYLE =====
const MOBILE_MAX_WIDTH = "500px";
const appContainerStyle = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  width: "100%",
  maxWidth: MOBILE_MAX_WIDTH,
  margin: "0 auto",
  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  position: "relative",
  overflow: "hidden",
  backgroundColor: "#ffffffe6",
};

// ===== Main Tab Routes =====
const mainTabRoutes = ["/home", "/BookConsultant", "/PropertyListing", "/Management"];

// ===== Loading Component =====
const LoadingScreen = memo(() => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#fff'
  }}>
    <DotLoading color="primary" />
  </div>
));

// ===== Memoized TabBar Component =====
const MemoizedTabBar = memo(({ activeTab, onTabChange, showTabs }) => {
  const tabs = useMemo(() => [
    { key: "home", icon: <AppOutline />, title: "Home", path: "/home" },
    {
      key: "BookConsultant",
      icon: <UserOutline />,
      title: "Book Consultant",
      path: "/BookConsultant",
    },
    {
      key: "PropertyListing",
      icon: <UnorderedListOutline />,
      title: "Property Listing",
      path: "/PropertyListing",
    },
    {
      key: "Management",
      icon: <SetOutline />,
      title: "Property Management",
      path: "/Management",
    },
  ], []);

  if (!showTabs) return null;

  return (
    <div style={{
      paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      backdropFilter: "blur(12px)",
      boxShadow: "0 -2px 10px rgba(0,0,0,0.05)",
    }}>
      <TabBar activeKey={activeTab} onChange={onTabChange}>
        {tabs.map((item) => (
          <TabBar.Item key={item.key} icon={item.icon} title={item.title} />
        ))}
      </TabBar>
    </div>
  );
});

// Custom memo comparison - only re-render if actual props change, ignore parent re-renders
const customCompare = (prevProps, nextProps) => {
  // Shallow compare props
  return JSON.stringify(prevProps) === JSON.stringify(nextProps);
};

// Memoized tab components - prevent re-renders when hidden
const MemoizedHome = memo(Home, customCompare);
const MemoizedBookConsultant = memo(BookConsultant, customCompare);
const MemoizedPropertyListing = memo(PropertyListing, customCompare);
const MemoizedManagement = memo(Management, customCompare);
const MemoizedPostProperty = memo(PostProperty, customCompare);
const MemoizedMyProperties = memo(MyProperties, customCompare);
const MemoizedPropertyDetails = memo(PropertyDetails, customCompare);
const MemoizedProfile = memo(Profile, customCompare);
const MemoizedFavorites = memo(Favorites, customCompare);
const MemoizedMyConsultants = memo(MyConsultants, customCompare);
const MemoizedMyAgents = memo(MyAgents, customCompare);

export default function App() {
  const dispatch = useDispatch();
  const { isLoggedIn, loading } = useSelector((state) => state.auth);
  const location = useLocation();
  const navigate = useNavigate();

  // Track current view state
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'BookConsultant' | 'PropertyListing' | 'Management' | 'other'

  // ===== Determine if we should show tabs =====
  const shouldShowTabs = useMemo(() => {
    return mainTabRoutes.includes(location.pathname);
  }, [location.pathname]);

  // ===== Handle navigation without re-renders =====
  useEffect(() => {
    const path = location.pathname;
    
    if (path === "/" || path === "/home") {
      setCurrentView('home');
    } else if (path.startsWith("/BookConsultant")) {
      setCurrentView('BookConsultant');
    } else if (path.startsWith("/PropertyListing")) {
      setCurrentView('PropertyListing');
    } else if (path.startsWith("/Management")) {
      setCurrentView('Management');
    } else {
      setCurrentView('other');
    }
  }, [location.pathname]);

  // ===== Track Navigation State =====
  useEffect(() => {
    const isMainTab = mainTabRoutes.includes(location.pathname);
    
    const navigationState = {
      canGoBack: !isMainTab,
      currentPath: location.pathname,
      isMainTab: isMainTab
    };
    
    sendToReactNative({
      type: "NAVIGATION_STATE",
      payload: navigationState
    });
  }, [location, shouldShowTabs]);

  // ===== Send message to React Native =====
  const sendToReactNative = useCallback((data) => {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(data));
    }
  }, []);

  // ===== Handle messages from React Native =====
  useEffect(() => {
    const handleMessage = (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        if (data.type === "NAVIGATE_TO" && data.payload.path) {
          navigate(data.payload.path);
        } else if (data.type === "GO_BACK") {
          if (!shouldShowTabs) {
            navigate("/home");
          }
        }
      } catch (error) {
        console.log("Error handling message from React Native:", error);
      }
    };

    document.addEventListener("message", handleMessage);
    window.addEventListener("message", handleMessage);

    return () => {
      document.removeEventListener("message", handleMessage);
      window.removeEventListener("message", handleMessage);
    };
  }, [navigate, shouldShowTabs]);

  // ===== Improved Token Validation =====
  const validateToken = useCallback(async (token) => {
    try {
      if (!token) return false;
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) return false;
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  // ===== Check Token & Auto Login =====
  const refreshSession = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) return false;

      const { data } = await api.post("/auth/refresh", { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = data;

      if (!accessToken || !newRefreshToken) return false;

      localStorage.setItem("authToken", accessToken);
      localStorage.setItem("refreshToken", newRefreshToken);
      return true;
    } catch (err) {
      console.warn("Session refresh failed:", err.message);
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      return false;
    }
  }, []);

  // ===== Improved Auth Initialization =====
  useEffect(() => {
    const initAuth = async () => {
      try {
        const accessToken = localStorage.getItem("authToken");
        const refreshToken = localStorage.getItem("refreshToken");

        if (!accessToken && !refreshToken) {
          dispatch(setLoggedIn(false));
          dispatch(setLoading(false));
          return;
        }

        if (accessToken && await validateToken(accessToken)) {
          dispatch(setLoggedIn(true));
          dispatch(setLoading(false));
          return;
        }

        if (refreshToken) {
          const refreshSuccess = await refreshSession();
          dispatch(setLoggedIn(refreshSuccess));
          dispatch(setLoading(false));
          return;
        }

        dispatch(setLoggedIn(false));
        dispatch(setLoading(false));
      } catch (error) {
        console.error("Auth initialization error:", error);
        dispatch(setLoggedIn(false));
        dispatch(setLoading(false));
      }
    };

    initAuth();
  }, [validateToken, refreshSession]);

  // ===== Redirect to home after login =====
  useEffect(() => {
    if (isLoggedIn === true && location.pathname === '/login') {
      navigate('/home', { replace: true });
    }
  }, [isLoggedIn, location.pathname, navigate]);

  // ===== Persist login state =====
  useEffect(() => {
    if (isLoggedIn !== null) {
      localStorage.setItem("loggedIn", isLoggedIn ? "true" : "false");
    }
  }, [isLoggedIn]);

  // ===== Logout =====
  const handleLogout = useCallback(() => {
    dispatch(logout());
    Toast.show({ content: "Logged out successfully!", icon: "success" });
    navigate('/login');
  }, [dispatch, navigate]);

  // ===== Handle Tab Change =====
  const handleTabChange = useCallback((key) => {
    const routes = {
      home: "/home",
      BookConsultant: "/BookConsultant",
      PropertyListing: "/PropertyListing",
      Management: "/Management"
    };
    
    if (routes[key]) {
      navigate(routes[key]);
    }
  }, [navigate]);

  // ===== Show loading while checking auth =====
  if (loading || isLoggedIn === null) {
    return <LoadingScreen />;
  }

  // ===== Show login if not authenticated =====
  if (!isLoggedIn) {
    return <Login onLoginSuccess={() => dispatch(setLoggedIn(true))} />;
  }

  // ===== MAIN APP =====
  return (
    <div style={appContainerStyle}>
      {/* MAIN CONTENT */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
          width: "100%",
        }}
      >
        {/* ALWAYS MOUNTED TAB COMPONENTS - Keep in DOM, use memo to prevent re-renders */}
        <div style={{ 
          display: currentView === 'home' ? 'block' : 'none',
          height: '100%',
          overflowY: 'auto',
          willChange: 'contents'
        }}>
          <MemoizedHome />
        </div>

        <div style={{ 
          display: currentView === 'BookConsultant' ? 'block' : 'none',
          height: '100%',
          overflowY: 'auto',
          willChange: 'contents'
        }}>
          <MemoizedBookConsultant />
        </div>

        <div style={{ 
          display: currentView === 'PropertyListing' ? 'block' : 'none',
          height: '100%',
          overflowY: 'auto',
          willChange: 'contents'
        }}>
          <MemoizedPropertyListing />
        </div>

        <div style={{ 
          display: currentView === 'Management' ? 'block' : 'none',
          height: '100%',
          overflowY: 'auto',
          willChange: 'contents'
        }}>
          <MemoizedManagement />
        </div>

        {/* NON-TAB PAGES */}
        <div style={{ 
          display: currentView === 'other' ? 'block' : 'none',
          height: '100%',
          overflowY: 'auto'
        }}>
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/post-property" element={<MemoizedPostProperty />} />
            <Route path="/profile/:id" element={<MemoizedBookConsultant />} />
            <Route path="/PropertyDetails/:id" element={<MemoizedPropertyDetails />} />
            <Route path="/property/:id" element={<MemoizedPropertyDetails />} />
            <Route path="/my-properties" element={<MemoizedMyProperties />} />
            <Route path="/favorites" element={<MemoizedFavorites />} />
            <Route path="/profile" element={<MemoizedProfile onLogout={handleLogout} />} />
            <Route path="/MyConsultants" element={<MemoizedMyConsultants />} />
            <Route path="/agentData" element={<MemoizedMyAgents />} />
            <Route path="/login" element={<Navigate to="/home" replace />} />
          </Routes>
        </div>
      </div>

      {/* TAB BAR - Only show on main tabs */}
      <MemoizedTabBar 
        activeTab={currentView} 
        onTabChange={handleTabChange}
        showTabs={shouldShowTabs}
      />
    </div>
  );
}