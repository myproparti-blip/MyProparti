// services/advertise.js
import api from "./axios";

export const advertisementService = {
  // Upload image advertisement
  uploadImage: (formData) => {
    return api.post("/advertisements/upload/image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // Upload video advertisement
  uploadVideo: (formData) => {
    return api.post("/advertisements/upload/video", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // Upload multiple files
  uploadMultiple: (formData) => {
    return api.post("/advertisements/upload/multiple", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // Get all advertisements - FIXED: Add pageKey parameter
  getAllAdvertisements: (pageKey = null) => {
    const params = {};
    if (pageKey) {
      params.pageKey = pageKey;
    }
    return api.get("/advertisements", { params });
  },

  // Delete advertisement
  deleteAdvertisement: (id) => {
    return api.delete(`/advertisements/${id}`);
  },

  // Update advertisement redirect URL
  updateAdvertisementUrl: (id, data) => {
    return api.patch(`/advertisements/${id}/url`, data);
  }

};