import client from '../../shared/api/client.js';

export const uploadAPI = {
  // Generic (any authenticated user)
  uploadImage: (file, folder = 'general') => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', folder);
    return client.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadMultiple: (files, folder = 'general') => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    formData.append('folder', folder);
    return client.post('/upload/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadVideo: (file, folder = 'general') => {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('folder', folder);
    return client.post('/upload/video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteImage: (publicId, resourceType = 'image') =>
    client.delete('/upload/image', { data: { publicId, resourceType } }),

  // Vendor-specific (also saves to MongoDB Vendor document)
  uploadVendorCover: (file, onProgress) => {
    const formData = new FormData();
    formData.append('image', file);
    return client.post('/upload/vendor/cover', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },

  uploadVendorPortfolio: (files, caption = '', onProgress) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('media', file));
    formData.append('caption', caption);
    return client.post('/upload/vendor/portfolio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },

  deleteVendorPortfolioItem: (itemId) =>
    client.delete(`/upload/vendor/portfolio/${itemId}`),
};
