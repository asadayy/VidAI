import client from './client';

export const uploadAPI = {
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

  deleteImage: (publicId) => client.delete('/upload/image', { data: { publicId } }),
};
