import api from "./axios";

// Send OTP
export const sendOtp = async (phone, role) => {
  try {
    const { data } = await api.post("/auth/send-otp", { phone, role });
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
};

// Verify OTP
export const verifyOtp = async (phone, otp, role) => {
  try {
    const { data } = await api.post("/auth/verify-otp", { phone, otp, role });

    // Token handling
    const { accessToken, refreshToken, user } = data;

    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("authToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(user));
    }

    // For React Native WebView communication
    if (window.ReactNativeWebView && accessToken) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: "SET_TOKEN", token: accessToken })
      );
    }

    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
};

export const getProfile = async () => {
  try {
    const { data } = await api.get("/auth/profile");
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
};
export const deleteProfile = async (userId) => {
  try {
    const { data } = await api.delete(`/auth/delete/${userId}`);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};