import React, { useState, useRef, useEffect } from "react";
import {
  Button,
  Input,
  Checkbox,
  Toast,
  SpinLoading,
  AutoCenter,
  Grid,
} from "antd-mobile";
import { sendOtp, verifyOtp } from "../services/auth";

const roles = ["buyer", "seller", "owner", "investor", "agent", "consultant"];

// ✅ UPDATED: PROPER Global styles for OTP inputs
const globalStyles = `
  /* Target ALL Ant Design Mobile input elements in OTP section */
  .otp-input .adm-input-element {
    text-align: center !important;
    font-weight: 700 !important;
    font-size: 24px !important;
    letter-spacing: 2px;
    color: #1a202c !important;
    width: 100% !important;
    height: 100% !important;
    background: transparent !important;
    border: none !important;
    outline: none !important;
  }
  
  /* Filled OTP input styling */
  .otp-input.filled .adm-input-element {
    font-weight: 800 !important;
    font-size: 26px !important;
    color: #1677ff !important;
  }
  
  /* Focus state */
  .otp-input .adm-input-element:focus {
    text-align: center !important;
    font-weight: 800 !important;
    background: transparent !important;
  }
  
  /* Remove number input spinners */
  .otp-input .adm-input-element::-webkit-outer-spin-button,
  .otp-input .adm-input-element::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  
  .otp-input .adm-input-element[type=number] {
    -moz-appearance: textfield;
  }
  
  /* Ensure the input container takes full space */
  .otp-input .adm-input {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    height: 100% !important;
    width: 100% !important;
    text-align: center !important;
  }
  
  .otp-input .adm-input-inner {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    height: 100% !important;
    width: 100% !important;
    text-align: center !important;
  }
  
  /* Remove any padding/margin that might affect centering */
  .otp-input .adm-input-inner-wrapper {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    height: 100% !important;
    width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
  }
`;

// Inject global styles - MOVED INSIDE COMPONENT
const injectGlobalStyles = () => {
  if (typeof document !== 'undefined') {
    // Check if styles already exist to avoid duplicates
    const existingStyle = document.getElementById('otp-global-styles');
    if (!existingStyle) {
      const styleSheet = document.createElement("style");
      styleSheet.id = 'otp-global-styles';
      styleSheet.innerText = globalStyles;
      document.head.appendChild(styleSheet);
    }
  }
};

export default function Login({ onLoginSuccess }) {
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", ""]);
  const [selectedRole, setSelectedRole] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const otpRefs = useRef([]);

  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    
    // ✅ ADD THIS: Inject global styles
    injectGlobalStyles();
    
    // Prevent zooming on mobile
    const preventZoom = (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('touchstart', preventZoom, { passive: false });
    let lastTouchEnd = 0;
    
    const preventDoubleTapZoom = (e) => {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };
    
    document.addEventListener('touchend', preventDoubleTapZoom, { passive: false });
    
    // Set viewport to prevent zoom
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
    
    return () => {
      window.removeEventListener("resize", checkMobile);
      document.removeEventListener('touchstart', preventZoom);
      document.removeEventListener('touchend', preventDoubleTapZoom);
    };
  }, []);

  /* ----------------------- Handle OTP Input ----------------------- */
  const handleOtpChange = async (val, index) => {
    if (!/^\d*$/.test(val)) return;
    
    const newOtp = [...otpDigits];
    newOtp[index] = val;
    setOtpDigits(newOtp);

    // Move focus to next input when a digit is entered
    if (val && index < 3) {
      setTimeout(() => {
        otpRefs.current[index + 1]?.focus();
      }, 10);
    }

    // Auto verify when all 4 digits are filled
    if (newOtp.every((d) => d !== "")) {
      const otp = newOtp.join("");
      setLoading(true);
      try {
        const res = await verifyOtp(phone, otp, selectedRole);
        if (res.success && res.data.success) {
          localStorage.setItem("authToken", res.data.accessToken);
          // STORE USER DATA
          localStorage.setItem("currentUser", JSON.stringify(res.data.user));
          Toast.show({ content: res.data.message || "Login successful!" });
          onLoginSuccess(res.data.user);
        } else {
          throw new Error(res.error);
        }
      } catch (err) {
        console.error(err);
        setOtpDigits(["", "", "", ""]);
        setTimeout(() => {
          otpRefs.current[0]?.focus();
        }, 10);
        Toast.show({ content: "Invalid OTP. Try again.", icon: "fail" });
      } finally {
        setLoading(false);
      }
    }
  }; // ✅ FIXED: Added missing closing brace

  /* ----------------------- Handle OTP Key Down ----------------------- */
  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      
      const newOtp = [...otpDigits];
      
      // If current input is empty and backspace is pressed, move to previous input
      if (!newOtp[index] && index > 0) {
        newOtp[index - 1] = "";
        setOtpDigits(newOtp);
        setTimeout(() => {
          otpRefs.current[index - 1]?.focus();
        }, 10);
      }
      // If current input has value, clear it but stay in same input
      else if (newOtp[index]) {
        newOtp[index] = "";
        setOtpDigits(newOtp);
      }
    }
    
    // Handle arrow keys for navigation
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      setTimeout(() => {
        otpRefs.current[index - 1]?.focus();
      }, 10);
    }
    
    if (e.key === 'ArrowRight' && index < 3) {
      e.preventDefault();
      setTimeout(() => {
        otpRefs.current[index + 1]?.focus();
      }, 10);
    }
  };

  /* ----------------------- Handle Send OTP ----------------------- */
  const handleSendOtp = async () => {
    if (!phone || !selectedRole || !agreed) {
      setErrorMessage("Please enter phone, select role, and agree to terms.");
      Toast.show({
        content: "Please enter phone, select role, and agree to terms.",
        icon: "fail",
      });
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      setErrorMessage("Enter a valid 10-digit Indian number.");
      Toast.show({ content: "Enter a valid 10-digit Indian number.", icon: "fail" });
      return;
    }

    setLoading(true);
    setErrorMessage(""); // clear previous error

    try {
      const res = await sendOtp(phone, selectedRole);

      if (res?.data?.success === false) {
        setErrorMessage(res?.data?.message || "Something went wrong");
        Toast.show({
          content: res?.data?.message || "Something went wrong",
          icon: "fail",
        });
        return;
      }

      if (res.success && res.data.success) {
        setErrorMessage("");
        Toast.show({ content: res.data.message || "OTP sent successfully!" });
        setStep("otp");
        setTimeout(() => {
          otpRefs.current[0]?.focus();
        }, 100);
      } else {
        throw new Error(res.error);
      }
    } catch (err) {
      console.error(err);
      const backendMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to send OTP";
      setErrorMessage(backendMessage);
      Toast.show({ content: backendMessage, icon: "fail" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!phone) {
      Toast.show({ content: "Please enter a valid phone number.", icon: "fail" });
      return;
    }

    setLoading(true);
    try {
      const res = await sendOtp(phone, selectedRole);
      if (res.success && res.data.success) {
        Toast.show({ content: res.data.message || "OTP resent successfully!" });
        setOtpDigits(["", "", "", ""]);
        setTimeout(() => {
          otpRefs.current[0]?.focus();
        }, 10);
      } else {
        throw new Error(res.error);
      }
    } catch (err) {
      console.error(err);
      Toast.show({ content: "Failed to resend OTP", icon: "fail" });
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------- Handle Paste OTP ----------------------- */
  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').slice(0, 4);
    if (/^\d{4}$/.test(pasteData)) {
      const newOtp = pasteData.split('');
      setOtpDigits(newOtp);
      
      // Auto verify after paste
      setTimeout(() => {
        const otp = newOtp.join("");
        handleVerifyOtp(otp);
      }, 100);
    }
  };

  /* ----------------------- Separate Verify Function ----------------------- */
  const handleVerifyOtp = async (otp) => {
    setLoading(true);
    try {
      const res = await verifyOtp(phone, otp, selectedRole);
      if (res.success && res.data.success) {
        localStorage.setItem("authToken", res.data.accessToken);
        // STORE USER DATA
        localStorage.setItem("currentUser", JSON.stringify(res.data.user));
        Toast.show({ content: res.data.message || "Login successful!" });
        onLoginSuccess(res.data.user);
      } else {
        throw new Error(res.error);
      }
    } catch (err) {
      console.error(err);
      setOtpDigits(["", "", "", ""]);
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 10);
      Toast.show({ content: "Invalid OTP. Try again.", icon: "fail" });
    } finally {
      setLoading(false);
    }
  }; // ✅ FIXED: Added missing closing brace

  return (
    <div style={styles.container}>
      {loading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingContent}>
            <SpinLoading color="primary" style={{ "--size": "48px" }} />
            <AutoCenter style={{ marginTop: 16, color: "#1677ff", fontWeight: 500 }}>
              Processing...
            </AutoCenter>
          </div>
        </div>
      )}

      <div style={styles.card}>
        {/* ✅ Dynamic Error Message Display */}
        {errorMessage && (
          <div
            style={{
              backgroundColor: "#ffe6e6",
              color: "#cc0000",
              padding: "10px 14px",
              borderRadius: "10px",
              marginBottom: "16px",
              fontWeight: "600",
              textAlign: "center",
              boxShadow: "0 2px 6px rgba(255, 0, 0, 0.1)",
              border: "1px solid #ffcccc",
            }}
          >
            {errorMessage}
          </div>
        )}

        {step === "phone" ? (
          <>
            <div style={styles.header}>
              <div style={styles.logo}>🚀</div>
              <h2 style={styles.title}>Welcome to PropertEase</h2>
              <p style={styles.subtitle}>Enter your details to get started</p>
            </div>

            <div style={styles.formContainer}>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Mobile Number</label>
                <div style={styles.phoneInputContainer}>
                  <div style={styles.countryCode}>+91</div>
                  <Input
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    type="tel"
                    value={phone}
                    onChange={(val) => setPhone(val.replace(/\D/g, ""))}
                    clearable
                    style={styles.phoneInput}
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Select Your Role</label>
                <Grid columns={2} gap={8}>
                  {roles.map((role) => (
                    <Grid.Item key={role}>
                      <Button
                        block
                        color={selectedRole === role ? "primary" : "default"}
                        size="middle"
                        style={{
                          ...styles.roleButton,
                          ...(selectedRole === role ? styles.roleButtonActive : {}),
                        }}
                        onClick={() => setSelectedRole(role)}
                      >
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </Button>
                    </Grid.Item>
                  ))}
                </Grid>
              </div>

              <div style={styles.termsContainer}>
                <Checkbox
                  checked={agreed}
                  onChange={setAgreed}
                  style={styles.checkbox}
                >
                  <span style={styles.checkboxText}>
                    I agree to the{" "}
                    <a href="#" style={styles.link}>
                      Terms & Conditions
                    </a>{" "}
                    and{" "}
                    <a href="#" style={styles.link}>
                      Privacy Policy
                    </a>
                  </span>
                </Checkbox>
              </div>

              <Button
                block
                color="primary"
                size="large"
                style={styles.sendButton}
                onClick={handleSendOtp}
                disabled={!phone || !selectedRole || !agreed}
                loading={loading}
              >
                Send OTP
              </Button>
            </div>
          </>
        ) : (
          <>
            <div style={styles.header}>
              <div style={styles.logo}>🔐</div>
              <h2 style={styles.title}>Verify OTP</h2>
              <p style={styles.subtitle}>
                Sent to +91 {phone}{" "}
                <span
                  style={styles.changeLink}
                  onClick={() => {
                    setStep("phone");
                    setOtpDigits(["", "", "", ""]);
                  }}
                >
                  Change
                </span>
              </p>
            </div>

            <div style={styles.otpSection}>
              {/* ✅ UPDATED: OTP Container with bold and centered text */}
              <div style={styles.otpContainer} onPaste={handlePaste}>
                {otpDigits.map((d, i) => (
                  <div key={i} style={styles.otpInputWrapper}>
                    <Input
                      maxLength={1}
                      value={d}
                      onChange={(val) => handleOtpChange(val, i)}
                      onKeyDown={(e) => handleKeyDown(e, i)}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="tel"
                      inputMode="numeric"
                      style={{
                        ...styles.otpInput,
                        ...(d ? styles.otpInputFilled : {})
                      }}
                      className={`otp-input ${d ? 'filled' : ''}`}
                      disabled={loading}
                    />
                  </div>
                ))}
              </div>

              <p style={styles.otpHint}>
                OTP will auto-verify once all 4 digits are entered
              </p>

              <div style={styles.resend}>
                <span style={styles.resendText}>Didn't receive OTP? </span>
                <Button
                  size="small"
                  color="primary"
                  fill="none"
                  onClick={handleResendOtp}
                  disabled={loading}
                  style={styles.resendButton}
                >
                  Resend OTP
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  // ... (your existing styles object remains the same)
  container: {
    width: "100%",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    touchAction: "manipulation",
    WebkitTouchCallout: "none",
    WebkitUserSelect: "none",
    KhtmlUserSelect: "none",
    MozUserSelect: "none",
    msUserSelect: "none",
    userSelect: "none",
    overflow: "hidden",
    boxSizing: "border-box",
  },
  card: {
    width: "100%",
    maxWidth: "400px",
    minHeight: "500px",
    background: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(10px)",
    borderRadius: "20px",
    padding: "24px 20px",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1), 0 8px 24px rgba(0, 0, 0, 0.08)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    position: "relative",
    overflow: "hidden",
    boxSizing: "border-box",
  },
  header: {
    textAlign: "center",
    marginBottom: "28px",
  },
  logo: {
    fontSize: "44px",
    marginBottom: "16px",
  },
  title: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "700",
    color: "#1a202c",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    marginBottom: "8px",
    lineHeight: "1.3",
  },
  subtitle: {
    margin: 0,
    fontSize: "14px",
    color: "#718096",
    fontWeight: "400",
    lineHeight: "1.4",
  },
  formContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  inputLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#2d3748",
    marginBottom: "2px",
  },
  phoneInputContainer: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    width: "100%",
  },
  countryCode: {
    position: "absolute",
    left: "12px",
    zIndex: 2,
    fontSize: "15px",
    fontWeight: "500",
    color: "#4a5568",
    background: "#f7fafc",
    padding: "6px 8px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
  },
  phoneInput: {
    borderRadius: "14px",
    background: "#fff",
    border: "2px solid #e2e8f0",
    transition: "all 0.2s ease",
    fontSize: "16px",
    height: "48px",
    paddingLeft: "70px",
    width: "100%",
  },
  roleButton: {
    borderRadius: "14px",
    fontSize: "13px",
    fontWeight: "500",
    height: "42px",
    border: "2px solid #e2e8f0",
    background: "#fff",
    transition: "all 0.2s ease",
  },
  roleButtonActive: {
    border: "2px solid #1677ff",
    background: "#1677ff",
    color: "#fff",
    boxShadow: "0 4px 12px rgba(22, 119, 255, 0.3)",
  },
  termsContainer: {
    marginTop: "4px",
  },
  checkbox: {
    alignItems: "flex-start",
    "--icon-size": "18px",
    "--font-size": "14px",
  },
  checkboxText: {
    fontSize: "13px",
    color: "#4a5568",
    lineHeight: "1.4",
  },
  link: {
    color: "#1677ff",
    textDecoration: "none",
    fontWeight: "500",
  },
  sendButton: {
    borderRadius: "14px",
    height: "50px",
    fontSize: "16px",
    fontWeight: "600",
    background: "linear-gradient(135deg, #1677ff 0%, #722ed1 100%)",
    border: "none",
    marginTop: "8px",
    boxShadow: "0 4px 12px rgba(22, 119, 255, 0.3)",
  },
  otpSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
  },
  otpContainer: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    margin: "24px 0",
    width: "100%",
  },
  otpInputWrapper: {
    flex: 1,
    maxWidth: "65px",
  },
  otpInput: {
    width: "100%",
    height: "65px",
    borderRadius: "16px",
    border: "2px solid #e2e8f0",
    background: "#fff",
    transition: "all 0.3s ease",
    color: "#1a202c",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
    outline: "none",
    WebkitAppearance: "none",
    MozAppearance: "textfield",
  },
  otpInputFilled: {
    borderColor: "#1677ff",
    background: "linear-gradient(135deg, #f0f7ff 0%, #e6f3ff 100%)",
    boxShadow: "0 4px 12px rgba(22, 119, 255, 0.15)",
    color: "#1677ff",
    transform: "translateY(-2px)",
  },
  otpHint: {
    textAlign: "center",
    fontSize: "13px",
    color: "#718096",
    marginBottom: "20px",
    lineHeight: "1.4",
  },
  resend: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    flexWrap: "wrap",
  },
  resendText: {
    fontSize: "14px",
    color: "#718096",
  },
  resendButton: {
    fontSize: "14px",
    fontWeight: "500",
  },
  changeLink: {
    color: "#1677ff",
    marginLeft: "6px",
    fontWeight: "500",
    textDecoration: "none",
    cursor: "pointer",
  },
  loadingOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(255, 255, 255, 0.92)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    backdropFilter: "blur(8px)",
  },
  loadingContent: {
    background: "rgba(255, 255, 255, 0.95)",
    padding: "28px",
    borderRadius: "18px",
    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.15)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
  },
};