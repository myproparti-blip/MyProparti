import React, { useState, useEffect } from "react";
import { Button, Toast, SpinLoading } from "antd-mobile";
import { createUpiOrder, verifyUpiPayment } from "../../services/payment";

const PaymentsPage = () => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("💡 Razorpay Key:", process.env.REACT_APP_RAZORPAY_KEY_ID);
  }, []);

  const handlePayment = async () => {
    try {
      setLoading(true);

      // ✅ Step 1: Create order from backend
      const res = await createUpiOrder(500);
      if (!res.success || !res.orderId) {
        Toast.show({ content: "Failed to create order" });
        return;
      }

      // ✅ Step 2: Configure Razorpay checkout
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: res.amount,
        currency: "INR",
        name: "MyProparti",
        description: "Property Booking Payment",
        order_id: res.orderId,
        handler: async function (response) {
          // ✅ Step 3: Verify payment
          const verify = await verifyUpiPayment(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature
          );

          if (verify.success) {
            Toast.show({ content: "✅ Payment successful!" });
          } else {
            Toast.show({ content: "❌ Payment verification failed!" });
          }
        },
        theme: { color: "#0d6efd" },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Payment error:", error);
      Toast.show({ content: "Error creating payment" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: 20,
        textAlign: "center",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        backgroundColor: "#f9fafb",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 30,
          borderRadius: 16,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          maxWidth: 400,
          margin: "0 auto",
        }}
      >
        <h3 style={{ marginBottom: 20, color: "#333" }}>💳 Pay with Razorpay</h3>
        {loading ? (
          <SpinLoading color="primary" />
        ) : (
          <Button color="primary" block onClick={handlePayment}>
            Pay ₹500
          </Button>
        )}
      </div>
    </div>
  );
};
export default PaymentsPage;