// src/services/debug.js
import api from './api';

export const debugAPI = {
  // Test backend connection
  testConnection: async () => {
    try {
      const response = await api.get('/profile');
      console.log('Backend connection test:', response.status, response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Backend connection failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Test file upload endpoint
  testFileUpload: async () => {
    try {
      // Create a simple test file
      const testText = "Photosynthesis is the process by which plants convert sunlight into energy. Water + Carbon Dioxide = Glucose + Oxygen.";
      const blob = new Blob([testText], { type: 'text/plain' });
      const testFile = new File([blob], 'test.txt', { type: 'text/plain' });

      const formData = new FormData();
      formData.append('file', testFile);

      const response = await api.post('/media_flashcards', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('File upload test:', response.status, response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('File upload test failed:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.message,
        status: error.response?.status,
        data: error.response?.data 
      };
    }
  },

  // Test text generation endpoint
  testTextGeneration: async () => {
    try {
      const testText = "Newton's First Law: An object at rest stays at rest unless acted upon by an external force.";
      
      const response = await api.post('/chat_flashcards', {
        text: testText
      });
      console.log('Text generation test:', response.status, response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Text generation test failed:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.message,
        status: error.response?.status,
        data: error.response?.data 
      };
    }
  },

  // Check all available endpoints
  checkEndpoints: async () => {
    const endpoints = [
      '/profile',
      '/get_flashcards',
      '/media_flashcards',
      '/chat_flashcards'
    ];

    const results = {};
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.get(endpoint);
        results[endpoint] = { status: response.status, data: response.data };
      } catch (error) {
        results[endpoint] = { 
          status: error.response?.status || 'error',
          error: error.message,
          data: error.response?.data 
        };
      }
    }

    console.log('Endpoint check results:', results);
    return results;
  }
};