import api from "./axios";
export const createUpiOrder = async (amount, userId) => {
  try {
    const { data } = await api.post("/payments/order", { amount, userId });
    return { success: true, ...data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.error || "Failed to create UPI order",
    };
  }
};
export const verifyUpiPayment = async (orderId, paymentId, signature) => {
  try {
    const { data } = await api.post("/payments/verify", {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    });
    return { success: data.success };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.error || "Payment verification failed",
    };
  }
};