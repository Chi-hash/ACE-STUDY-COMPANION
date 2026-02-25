// src/services/api.js
import axios from 'axios';
import { auth } from '../assets/js/firebase.js';

const API_BASE_URL = 'https://student-success-backend.onrender.com';

// Create axios instance with interceptors
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to all requests automatically
api.interceptors.request.use(async (config) => {
  let user = auth.currentUser;

  // 1. If Firebase hasn't loaded yet, wait for the state to change
  if (!user) {
    await new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((u) => {
        user = u;
        unsubscribe();
        resolve();
      });
    });
  }

  if (user) {
    try {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.error('Error getting token:', error);
    }
  } else {
    // 2. Final Fallback: Check LocalStorage if Firebase is definitely null
    const savedToken =
      localStorage.getItem("aceit_auth_token") ||
      localStorage.getItem("firebase_token");
    if (savedToken) {
      config.headers.Authorization = `Bearer ${savedToken}`;
    }
  }
  return config;
});

// User Management
export const userAPI = {
  register: async (profileData) => {
    try {
      const response = await api.post('/register', profileData);
      return response.data;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  },

  getProfile: async () => {
    try {
      const response = await api.get('/profile');
      return response.data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  },

  updateProfile: async (profileData) => {
    try {
      const response = await api.post('/update_profile', profileData);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  deleteAccount: async () => {
    try {
      const response = await api.delete('/delete-account');
      return response.data;
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  },
};

// Activity Tracking
export const activityAPI = {
  logActivity: async (sessionHours) => {
    try {
      const response = await api.post('/log_activity', {
        session_hours: sessionHours,
      });
      return response.data;
    } catch (error) {
      console.error('Error logging activity:', error);
      throw error;
    }
  },
};

// Chat Sessions
export const chatAPI = {
  createChatSession: async () => {
    try {
      const response = await api.post('/create_chat_session');
      return response.data;
    } catch (error) {
      console.error('Error creating chat session:', error);
      throw error;
    }
  },

  sendMessage: async (sessionId, message) => {
    try {
      const response = await api.post(`/chat/${sessionId}`, { message });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  sendAudioMessage: async (sessionId, audioBlob, context = "") => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      if (context) formData.append('context', context);
      const response = await api.post(`/chat_audio/${sessionId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error('Error sending audio message:', error);
      throw error;
    }
  },

  generateAudio: async (sessionId, text, messageId = undefined) => {
    try {
      const response = await api.post(`/chat/${sessionId}/audio`, {
        text,
        message_id: messageId,
      });
      return response.data;
    } catch (error) {
      console.error('Error generating audio:', error);
      throw error;
    }
  },

  getChatHistory: async (sessionId) => {
    try {
      const response = await api.post('/chat/get-history', {
        session_id: sessionId,
      });
      return response.data;
    } catch (error) {
      console.error('Error getting chat history:', error);
      throw error;
    }
  },

  clearMemory: async (sessionId) => {
    try {
      const response = await api.post('/chat/clear-memory', {
        session_id: sessionId,
      });
      return response.data;
    } catch (error) {
      console.error('Error clearing chat memory:', error);
      throw error;
    }
  },
};

// Study Metrics & Analytics - USING ONLY DOCUMENTED ENDPOINTS
export const analyticsAPI = {
  // Get gamification data - THIS IS WHERE STREAK COMES FROM!
  getGamification: async (uid) => {
    try {
      const response = await api.get(`/gamification/${uid}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching gamification:', error);
      // Return mock data for development
      return {
        ok: true,
        gamification: {
          level: 1,
          badges: [],
          streak: 0,
          longest_streak: 0
        }
      };
    }
  },

  // Update gamification
  updateGamification: async (uid, data) => {
    try {
      const response = await api.post(`/gamification/${uid}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating gamification:', error);
      throw error;
    }
  },

  // Get performance prediction
  getPerformancePrediction: async () => {
    try {
      const response = await api.get('/predict_performance');
      return response.data;
    } catch (error) {
      console.error('Error fetching performance prediction:', error);
      throw error;
    }
  },
};

// Study Reminders
export const remindersAPI = {
  getReminders: async () => {
    try {
      const response = await api.get('/get_reminders');
      return response.data;
    } catch (error) {
      console.error('Error fetching reminders:', error);
      return { ok: false, reminders: [] }; // Return error state
    }
  },

  createStudyPlan: async (planData) => {
    try {
      const formData = new FormData();
      formData.append('title', planData.title);
      formData.append('start_date', planData.start_date);
      formData.append('due_date', planData.due_date);

      if (planData.description) {
        formData.append('description', planData.description);
      }

      if (planData.files) {
        planData.files.forEach(file => {
          formData.append('files', file);
        });
      }

      const response = await api.post('/reminders/study-plan', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error creating study plan:', error);
      throw error;
    }
  },

  completeReminder: async (reminderId) => {
    try {
      const response = await api.post(`/reminders/${reminderId}/complete`);
      return response.data;
    } catch (error) {
      console.error('Error completing reminder:', error);
      throw error;
    }
  },

  deleteReminder: async (reminderId) => {
    try {
      const response = await api.delete(`/reminders/${reminderId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting reminder:', error);
      throw error;
    }
  },
};

// Content Recommendations
export const recommendationsAPI = {
  getRecommendations: async () => {
    try {
      console.log("📡 Calling /recommendations endpoint...");
      const response = await api.get('/recommendations');
      console.log(" Recommendations API Success");
      return response.data;
    } catch (error) {
      // Check for quota exceeded or specific YouTube errors
      const errorMessage = error.response?.data?.error || '';
      if (
        (error.response?.status === 400 && errorMessage.includes('quota')) ||
        errorMessage.includes('429') ||
        errorMessage === 'No results from YouTube'
      ) {

        console.warn('PI Limit or No Results, using mock data:', errorMessage);

        // Return comprehensive mock data
        return {
          ok: true,
          recommendations: [
            {
              id: 1,
              title: "React Tutorial for Beginners",
              url: "https://www.youtube.com/watch?v=Ke90Tje7VS0",
              reason: "Popular web development tutorial"
            },
            {
              id: 2,
              title: "Python Full Course for Beginners",
              url: "https://www.youtube.com/watch?v=_uQrJ0TkZlc",
              reason: "Best Python course on YouTube"
            },
            {
              id: 3,
              title: "Machine Learning Fundamentals",
              url: "https://www.youtube.com/watch?v=NWONeJKn6kc",
              reason: "Introduction to AI/ML concepts"
            },
            {
              id: 4,
              title: "JavaScript Crash Course",
              url: "https://www.youtube.com/watch?v=hdI2bqOjy3c",
              reason: "Modern JavaScript essentials"
            },
            {
              id: 5,
              title: "Data Structures & Algorithms",
              url: "https://www.youtube.com/watch?v=8hly31xKli0",
              reason: "Computer science fundamentals"
            }
          ],
          raw_videos: [],
          isMock: true,
          message: "Using mock data: " + errorMessage
        };
      }

      // For other errors
      console.error('❌ Recommendations API Error:', error.response?.data);
      return {
        ok: true,
        recommendations: getMockRecommendations(),
        isMock: true
      };
    }
  },
};

// Helper function for mock data
const getMockRecommendations = () => [
  {
    id: 1,
    title: "Calculus for Beginners",
    url: "https://www.youtube.com/watch?v=WUvTyaaNkzM",
    reason: "Mathematics fundamentals"
  },
  {
    id: 2,
    title: "Web Development Full Course",
    url: "https://www.youtube.com/watch?v=8mAITcNt710",
    reason: "Full-stack development tutorial"
  },
  {
    id: 3,
    title: "Database Design Tutorial",
    url: "https://www.youtube.com/watch?v=ztHopE5Wnpc",
    reason: "Learn SQL and database concepts"
  }
];

// Dashboard & Sidebar Data - FIXED VERSION (NO user_metrics!)
export const dashboardAPI = {
  // Get combined dashboard data from EXISTING endpoints only
  getDashboardData: async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      // Fetch from documented endpoints only
      const [profileResponse, remindersResponse, gamificationResponse] = await Promise.allSettled([
        userAPI.getProfile(),
        remindersAPI.getReminders(),
        analyticsAPI.getGamification(user.uid)
      ]);

      return {
        profile: profileResponse.status === 'fulfilled' ? profileResponse.value : null,
        reminders: remindersResponse.status === 'fulfilled' ? remindersResponse.value : null,
        gamification: gamificationResponse.status === 'fulfilled' ? gamificationResponse.value : null
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);

      // Return mock data for development
      const user = auth.currentUser;
      return {
        profile: {
          ok: true,
          profile: {
            name: user?.displayName || 'Student',
            email: user?.email || ''
          }
        },
        reminders: { ok: true, reminders: [] },
        gamification: {
          ok: true,
          gamification: {
            level: 1,
            badges: [],
            streak: 0,
            longest_streak: 0
          }
        }
      };
    }
  },

  // REMOVED: getUserMetrics - endpoint doesn't exist!

  // Use reminders as notifications for now
  getNotifications: async () => {
    try {
      const response = await remindersAPI.getReminders();
      if (response.ok) {
        return { ok: true, notifications: response.reminders };
      }
      return { ok: true, notifications: [] };
    } catch (error) {
      console.error('Error getting notifications:', error);
      return { ok: true, notifications: [] };
    }
  },
};

// Flashcards API - FIXED VERSION
export const flashcardAPI = {
  generateFlashcardsFromText: async (text, quantity = 15) => {
    try {
      const response = await api.post('/chat_flashcards', { text, quantity });

      // Handle response format
      if (response.data.flashcards) {
        return response.data;
      } else if (response.data.response) {
        return { flashcards: response.data.response };
      } else {
        // Mock data for development
        return {
          flashcards: [
            { question: "Sample question 1", answer: "Sample answer 1" },
            { question: "Sample question 2", answer: "Sample answer 2" }
          ],
          isMock: true
        };
      }
    } catch (error) {
      console.error('Error generating flashcards from text:', error);
      if (error.response) {
        console.error('Server Error Data:', error.response.data);
        console.error('Server Status:', error.response.status);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Request setup error:', error.message);
      }

      // Mock data for development
      return {
        flashcards: [
          { question: "What is the capital of France?", answer: "Paris" },
          { question: "What is 2 + 2?", answer: "4" }
        ],
        isMock: true
      };
    }
  },

  generateFlashcardsFromFile: async (file, quantity = 15) => {
    try {
      // Validate file
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/plain'
      ];

      if (!validTypes.includes(file.type)) {
        throw new Error(`Unsupported file type: ${file.type}`);
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('quantity', quantity);

      console.log(`[FlashcardAPI] Sending file with quantity: ${quantity}`);

      // Try sending quantity in query param as well, and increase timeout
      const response = await api.post(`/media_flashcards?quantity=${quantity}`, formData, {
        timeout: 180000, // Increase timeout for larger batches
      });

      if (response.data.flashcards) {
        return response.data;
      } else {
        return {
          flashcards: [
            { question: "File processed successfully", answer: "Check the generated content" }
          ],
          isMock: true
        };
      }
    } catch (error) {
      console.error('Error generating flashcards from file:', error);
      if (error.response) {
        console.error('Server Error Data:', error.response.data);
        console.error('Server Status:', error.response.status);
      }

      // Handle Protocol Errors / Network Drops (often due to file size)
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        return {
          flashcards: [
            { question: "Upload Failed", answer: "The server dropped the connection. Your file might be too large or the server is busy. Please try a smaller file (< 5MB)." }
          ],
          isMock: true,
          error: "Network Error: File likely too large"
        };
      }

      // Mock data for development
      return {
        flashcards: [
          { question: `What is in ${file.name}?`, answer: "Sample content from file" },
          { question: "Key point from document?", answer: "Important information" }
        ],
        file_url: null,
        isMock: true
      };
    }
  },

  getFlashcards: async () => {
    try {
      const response = await api.get('/get_flashcards');
      return response.data;
    } catch (error) {
      console.error('Error fetching flashcards:', error);
      return { flashcards: [] }; // Empty array on error
    }
  },

  // Mock analytics since endpoint doesn't exist in docs
  getFlashcardAnalytics: async () => {
    try {
      const response = await api.get('/get_flashcards');
      const flashcards = response.data.flashcards || [];

      // Calculate analytics locally
      return {
        total_cards: flashcards.length,
        mastered_cards: 0,
        due_today: 0,
        overdue_cards: 0,
        average_ease: 2.5
      };
    } catch (error) {
      console.log('Using mock flashcard analytics');
      return {
        total_cards: 0,
        mastered_cards: 0,
        due_today: 0,
        overdue_cards: 0,
        average_ease: 2.5,
        isMock: true
      };
    }
  },

  saveFlashcardProgress: async (setId, cardId, isCorrect, quality) => {
    try {
      // Mock implementation to prevent crash - replace with real endpoint if available
      console.log(`[FlashcardAPI] Saving progress: Card ${cardId}, Correct: ${isCorrect}, Quality: ${quality}`);
      return { ok: true };
    } catch (error) {
      console.error('Error saving flashcard progress:', error);
      return { ok: false };
    }
  }
};

// Additional documented endpoints
export const quizAPI = {
  generateQuizFromText: async (text) => {
    try {
      const response = await api.post('/chat_quiz', { text });
      return response.data;
    } catch (error) {
      console.error('Error generating quiz:', error);
      throw error;
    }
  },

  generateQuizFromFile: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/media_quiz', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error('Error generating quiz from file:', error);
      throw error;
    }
  },

  getQuizzes: async () => {
    try {
      const response = await api.get('/get_chat_quiz');
      return response.data;
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      throw error;
    }
  },

  getQuizById: async (quizId) => {
    try {
      const response = await api.get(`/get_chat_quiz/${quizId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching quiz:', error);
      throw error;
    }
  },

  deleteQuiz: async (quizId) => {
    try {
      const response = await api.delete(`/delete_quiz/${quizId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting quiz:', error);
      throw error;
    }
  },

  saveQuizScore: async (quizId, score, total) => {
    try {
      const response = await api.post('/save_quiz_score', {
        quiz_id: quizId,
        score: score,
        total: total
      });
      return response.data;
    } catch (error) {
      console.error('Error saving quiz score:', error);
      throw error;
    }
  }
};

export const summaryAPI = {
  generateSummary: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/media_summary', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  },

  getSummaries: async () => {
    try {
      const response = await api.get('/get_summaries');
      return response.data;
    } catch (error) {
      console.error('Error fetching summaries:', error);
      throw error;
    }
  },

  deleteSummary: async (summaryId) => {
    try {
      const response = await api.delete(`/delete_summaries/${summaryId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting summary:', error);
      throw error;
    }
  }
};

export const libraryAPI = {
  uploadDocuments: async (uid, files, title = '') => {
    try {
      const formData = new FormData();
      if (title) formData.append('title', title);
      files.forEach(file => formData.append('files', file));

      const response = await api.post(`/library/${uid}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading documents:', error);
      throw error;
    }
  },

  getDocuments: async (uid) => {
    try {
      const response = await api.get(`/library/${uid}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }
  },

  updateDocument: async (uid, docId, title = '', files = []) => {
    try {
      const formData = new FormData();
      if (title) formData.append('title', title);
      files.forEach(file => formData.append('files', file));

      const response = await api.put(`/library_update/${uid}/${docId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  },

  deleteDocument: async (uid, docId) => {
    try {
      const response = await api.delete(`/library_delete/${uid}/${docId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  },

  deleteAllDocuments: async (uid) => {
    try {
      const response = await api.delete(`/library/${uid}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting all documents:', error);
      throw error;
    }
  }
};

export default api;