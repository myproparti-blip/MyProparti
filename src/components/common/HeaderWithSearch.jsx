import React, { useState, useEffect, useRef, useMemo } from "react";
import { SearchBar, Toast, List, Popup } from "antd-mobile";
import {
    UserOutline,
    SetOutline,
    BellOutline,
    HeartOutline,
    TeamOutline,
    InformationCircleOutline,
    UnorderedListOutline,
    CloseCircleOutline,
    EnvironmentOutline,
} from "antd-mobile-icons";
import { useNavigate } from "react-router-dom";
import ProfilePopup from "../profile/Profile";

export default function HeaderWithSearch({
    searchValue,
    setSearchValue,
    city,
    setCity,
    onClearLocation,
}) {
    const [menuVisible, setMenuVisible] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [isManualSearch, setIsManualSearch] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const navigate = useNavigate();
    const hasCleared = useRef(false);
    const locationRequested = useRef(false);


    // ✅ Detect logged-in user role (for admin)
    useEffect(() => {
        try {
            const userData = JSON.parse(localStorage.getItem("user"));
            console.log("👤 Current User:", userData);

            // ✅ Handles array roles like ["admin"]
            const isAdminUser =
                Array.isArray(userData?.role) && userData.role.includes("admin");

            setIsAdmin(isAdminUser);
            console.log("👑 Admin Detected:", isAdminUser);
        } catch (error) {
            console.log("⚠️ Error parsing user data:", error);
            setIsAdmin(false);
        }
    }, []);

    // ✅ Load saved location or request new one
    useEffect(() => {
        if (locationRequested.current) return;
        locationRequested.current = true;

        const savedCity = localStorage.getItem("detectedCity");
        if (savedCity && savedCity !== "NA") {
            console.log("Loading saved city:", savedCity);
            setCity(savedCity);
            setSearchValue(savedCity);
            setIsManualSearch(false);
        } else {
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(
                    JSON.stringify({ type: "REQUEST_LOCATION" })
                );
            }
        }
    }, []);

    // ✅ Listen for location updates from native app
    useEffect(() => {
        const handleMessage = (event) => {
            try {
                const messageData =
                    typeof event.data === "string"
                        ? event.data
                        : event.nativeEvent?.data;

                const data = JSON.parse(messageData);

                if (
                    data.type === "LOCATION_UPDATE" ||
                    data.type === "LIVE_LOCATION_UPDATE"
                ) {
                    const detectedCity = data?.payload?.city?.trim();
                    if (detectedCity) {
                        setCity(detectedCity);
                        setSearchValue(detectedCity);
                        setIsManualSearch(false);
                        hasCleared.current = false;
                        localStorage.setItem("detectedCity", detectedCity);
                    }
                } else if (data.type === "LOCATION_CLEARED") {
                    setCity("");
                    setSearchValue("");
                    hasCleared.current = true;
                    localStorage.removeItem("detectedCity");
                } else if (data.type === "LOCATION_ERROR") {
                    Toast.show({ icon: "fail", content: "Location access denied" });
                }
            } catch (err) {
                console.log("❌ Message parse error:", err);
            }
        };

        window.addEventListener("message", handleMessage);
        document.addEventListener("message", handleMessage); // Android

        return () => {
            window.removeEventListener("message", handleMessage);
            document.removeEventListener("message", handleMessage);
        };
    }, [setCity, setSearchValue]);

    // ✅ Clear detected location
    const handleClearLocation = (e) => {
        e.stopPropagation();
        setCity("");
        setSearchValue("");
        hasCleared.current = true;
        localStorage.removeItem("detectedCity");

        // Notify parent component that user cleared location
        if (onClearLocation) {
            onClearLocation();
        }

        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(
                JSON.stringify({ type: "CLEAR_LOCATION" })
            );
        }
    };

    // ✅ Manual search input
    const handleSearchChange = (val) => {
        setSearchValue(val);
        if (!val) {
            // If search is cleared, reset to city detection state
            setIsManualSearch(false);
        } else {
            setIsManualSearch(true);
        }
    };

    const handleSearchSubmit = () => {
        if (!searchValue.trim()) return;
        Toast.show({ icon: "success", content: `Searching for ${searchValue}` });
    };

    // ✅ Menu items
    const menuItems = useMemo(() => {
        const baseMenuItems = [
            { icon: <UserOutline />, label: "My Profile", action: () => setShowProfile(true) },
            { icon: <SetOutline />, label: "Properties", action: () => navigate("/my-properties") },
            { icon: <BellOutline />, label: "Notifications", action: () => Toast.show("Coming soon") },
            { icon: <HeartOutline />, label: "Favorites", action: () => Toast.show("Coming soon") },
        ];

        const adminMenuItems = [
            { icon: <TeamOutline />, label: "Consultants", action: () => navigate("/MyConsultants") },
            { icon: <BellOutline />, label: "Payments", action: () => navigate("/payments") },
            { icon: <TeamOutline />, label: "Agents", action: () => navigate("/agentData") },
        ];

        const commonMenuItems = [
            { icon: <InformationCircleOutline />, label: "About Us", action: () => Toast.show("Coming soon") },
        ];

        // ✅ Only show extra items if admin
        return isAdmin
            ? [...baseMenuItems, ...adminMenuItems, ...commonMenuItems]
            : [...baseMenuItems, ...commonMenuItems];
    }, [isAdmin, navigate]);

    return (
        <>
            <header
                style={{
                    backgroundColor: "#fff",
                    padding: "5px 12px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ position: "relative", flex: 1 }}>
                        <SearchBar
                            value={searchValue}
                            placeholder="Search city or area..."
                            showCancelButton={false}
                            onChange={handleSearchChange}
                            onSearch={handleSearchSubmit}
                            style={{
                                flex: 1,
                                "--border-radius": "20px",
                                "--background": "#f2f2f2",
                                "--height": "47px",
                                "--padding-left": city && !isManualSearch && city !== searchValue ? "50px" : "12px",
                                "--padding-right": city && !isManualSearch && city !== searchValue ? "50px" : "12px",
                            }}
                        />

                        {/* ✅ City indicator - show when city is detected and not manually searching */}
                        {city && !isManualSearch && (
                            <>
                                <div
                                    style={{
                                        position: "absolute",
                                        left: "12px",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        color: "#00b8a9",
                                        display: "flex",
                                        alignItems: "center",
                                    }}
                                >
                                    <EnvironmentOutline style={{ fontSize: "18px" }} />
                                </div>
                                <div
                                    style={{
                                        position: "absolute",
                                        right: "12px",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        cursor: "pointer",
                                        backgroundColor: "#f2f2f2",
                                        padding: "4px",
                                        borderRadius: "50%",
                                    }}
                                    onClick={handleClearLocation}
                                >
                                    <CloseCircleOutline style={{ fontSize: "20px", color: "#999" }} />
                                </div>
                            </>
                        )}
                    </div>

                    <UnorderedListOutline
                        style={{ fontSize: 24, color: "#00b8a9", cursor: "pointer" }}
                        onClick={() => setMenuVisible(true)}
                    />
                </div>

                {/* ✅ Menu Popup */}
                <Popup
                    visible={menuVisible}
                    onMaskClick={() => setMenuVisible(false)}
                    position="right"
                    bodyStyle={{ width: "70vw", backgroundColor: "#fff", padding: 16 }}
                >
                    <h3 style={{ textAlign: "center", marginBottom: 16 }}>Menu</h3>
                    <List>
                        {menuItems.map((item, idx) => (
                            <List.Item
                                key={idx}
                                prefix={item.icon}
                                arrow
                                onClick={() => {
                                    item.action();
                                    setMenuVisible(false);
                                }}
                            >
                                {item.label}
                            </List.Item>
                        ))}
                    </List>
                </Popup>
            </header>

            {/* ✅ Profile Modal */}
            <ProfilePopup visible={showProfile} setVisible={setShowProfile} />
        </>
    );
}
