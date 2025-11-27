import api from "./axios";

export const getAgents = async () => {
  try {
    const { data } = await api.get("/agents");
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
}

export const getAgentById = async (id) => {
  try {
    const { data } = await api.get(`/agents/${id}`);
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
}

export const addAgent = async (formData) => {
  try {
    const { data } = await api.post("/agents", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
}

export const updateAgent = async (id, formData) => {
  try {
    const { data } = await api.put(`/agents/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
}

export const approveAgent = async (id) => {
  try {
    const { data } = await api.put(`/agents/${id}/approve`);
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
}

export const rejectAgent = async (id, rejectionData) => {
  try {
    const { data } = await api.put(`/agents/${id}/reject`, rejectionData);
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
}