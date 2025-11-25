import api from "./axios";

export const getConsultants = async () => {
  try {
    const { data } = await api.get("/consultants");
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

export const getConsultantById = async (id) => {
  try {
    const { data } = await api.get(`/consultants/${id}`);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

export const addConsultant = async (formData) => {
  try {
    const { data } = await api.post("/consultants", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

export const updateConsultant = async (id, formData) => {
  try {
    const { data } = await api.put(`/consultants/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || error.message };
  }
};
export const deleteConsultant = async (id) => {
  try {
    const { data } = await api.delete(`/consultants/${id}`);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || error.message };
  }
};
export const approveConsultant = async (id) => {
  try {
    const { data } = await api.put(`/consultants/${id}/approve`);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || error.message };
  }
};
export const rejectConsultant = async (id,rejectedReason) => {
  try {
    const { data } = await api.put(`/consultants/${id}/reject`,rejectedReason);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || error.message };
  }
};