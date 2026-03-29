# ACE Study Companion — Appendix A: Program Codes

Generated for thesis/dissertation. Copy sections into your document as needed.

**Before publishing:** Redact `apiKey` in `firebase.js` (use a placeholder). Remove any internal URLs if required by your institution.

**Other appendices (not in this file):**
- **Appendix B (screens/forms):** Add screenshots of Login, Register, Dashboard, and one feature page — take these from the running app.
- **Appendix C (diagrams):** ER / database diagrams belong to the **backend** project, not this React repo. Add a high-level architecture diagram if your supervisor requires it.

---

## Table of contents
1. `package.json` — dependencies
2. `src/main.jsx` — application entry
3. `src/App.jsx` — routing and auth
4. `src/assets/js/firebase.js` — Firebase Auth init
5. `src/services/apiClient.js` — REST API client
6. `src/pages/Login.jsx` — login
7. `src/pages/Register.jsx` — registration
8. `src/pages/Dashboard.jsx` — excerpt (shell + section routing)

---

## 1. package.json
```json
{
  "homepage": "https://github.com/Chi-hash/ACE-STUDY-COMPANION",
  "name": "ace-study-companion",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist",
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "test": "vitest",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.13.2",
    "firebase": "^12.7.0",
    "lucide-react": "^0.562.0",
    "prop-types": "^15.8.1",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-icons": "^5.5.0",
    "react-markdown": "^10.1.0",
    "react-router-dom": "^7.11.0",
    "recharts": "^3.6.0",
    "remark-breaks": "^4.0.0",
    "remark-gfm": "^4.0.1"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@types/react": "^19.2.5",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "gh-pages": "^6.3.0",
    "globals": "^16.5.0",
    "jsdom": "^28.1.0",
    "vite": "^7.2.4",
    "vitest": "^4.0.18"
  }
}```

## 2. src/main.jsx
```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)



```

## 3. src/App.jsx
```jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { auth } from "./assets/js/firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Flashcards from "./components/Flashcard.jsx";
import StudyCalendar from "./components/StudyCalendar.jsx";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check Firebase auth state on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Email/password users must have a verified email before gaining access
        const isEmailPasswordUser = user.providerData.some(
          (p) => p.providerId === "password"
        );
        if (isEmailPasswordUser && !user.emailVerified) {
          setCurrentUser(null);
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        const userData = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email?.split("@")[0] || "Student",
          photoURL: user.photoURL,
          phoneNumber: user.phoneNumber,
          streak: 7,
        };

        setCurrentUser(userData);
        setIsAuthenticated(true);

        localStorage.setItem("aceit_current_user", JSON.stringify(userData));
        localStorage.setItem("aceit_auth_token", user.accessToken || "");
      } else {
        // User is signed out — clear ALL user-specific cached data
        setCurrentUser(null);
        setIsAuthenticated(false);
        const keysToRemove = [
          "aceit_current_user",
          "aceit_auth_token",
          "firebase_token",
          "userData",
          // Flashcards
          "ace-it-flashcards",
          "ace-it-review-data",
          // Resources
          "ace-it-resources",
          "ace-it-resource-subjects",
          "ace-it-library-subject-map",
          "ace-summary-titles",
          // Quiz
          "quiz_history",
          // Settings & profile
          "aceit_settings",
          "aceit_profile_picture",
          // Chatbot
          "ace-it-voice-enabled",
          "ace-it-chat-sessions",
        ];
        keysToRemove.forEach((key) => localStorage.removeItem(key));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Show loading screen while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading AceIt...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes - redirect to dashboard if already authenticated */}
        <Route
          path="/"
          element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />}
        />
        <Route
          path="/register"
          element={
            !isAuthenticated ? <Register /> : <Navigate to="/dashboard" />
          }
        />

        {/* Protected Routes - redirect to login if not authenticated */}
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <Dashboard currentUser={currentUser} initialSection="dashboard" />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route
          path="/flashcards"
          element={
            isAuthenticated ? (
              <Dashboard
                currentUser={currentUser}
                initialSection="flashcards"
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route
          path="/quiz"
          element={
            isAuthenticated ? (
              <Dashboard currentUser={currentUser} initialSection="quiz" />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route
          path="/calendar"
          element={
            isAuthenticated ? (
              <Dashboard
                currentUser={currentUser}
                initialSection="StudyCalendar"
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route
          path="/analytics"
          element={
            isAuthenticated ? (
              <Dashboard currentUser={currentUser} initialSection="analytics" />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route
          path="/resources"
          element={
            isAuthenticated ? (
              <Dashboard currentUser={currentUser} initialSection="resources" />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route
          path="/chatbot"
          element={
            isAuthenticated ? (
              <Dashboard currentUser={currentUser} initialSection="chatbot" />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route
          path="/settings"
          element={
            isAuthenticated ? (
              <Dashboard currentUser={currentUser} initialSection="settings" />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

## 4. src/assets/js/firebase.js
_Replace `apiKey` with `<YOUR_API_KEY>` in the thesis PDF if required._
```js
// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBDkfhO_MEcyoMSWYhzUHwlf7GVCe0WVo4",
  authDomain: "ace-the-tutor.firebaseapp.com",
  projectId: "ace-the-tutor",
  storageBucket: "ace-the-tutor.firebasestorage.app",
  messagingSenderId: "684672667174",
  appId: "1:684672667174:web:c3909c3f99774e6364e0e7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);```

## 5. src/services/apiClient.js
```js
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

  uploadChatDocument: async (sessionId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post(`/chat/${sessionId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading chat document:', error);
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

  // Client-side only — no backend endpoint for clearing notifications.
  // Returns a resolved promise so callers can await it safely.
  clearNotifications: async () => {
    return { ok: true };
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
      const response = await api.post(`/flashcards/${setId}/progress`, {
        card_id: cardId,
        is_correct: isCorrect,
        quality: quality
      });
      return response.data;
    } catch (error) {
      console.error('Error saving flashcard progress:', error);
      throw error;
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

const SUMMARY_MIME_MAP = {
  '.pdf':  'application/pdf',
  '.doc':  'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt':  'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.xls':  'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt':  'text/plain',
};

export const summaryAPI = {
  generateSummary: async (file) => {
    try {
      // Ensure the file has the correct MIME type (Windows sometimes strips it)
      let resolvedFile = file;
      if (!file.type) {
        const ext = ('.' + file.name.split('.').pop()).toLowerCase();
        const mime = SUMMARY_MIME_MAP[ext];
        if (mime) {
          resolvedFile = new File([file], file.name, { type: mime });
        }
      }

      console.log(`[SummaryAPI] Uploading: ${resolvedFile.name} (${resolvedFile.type}, ${(resolvedFile.size / 1024).toFixed(1)} KB)`);

      const formData = new FormData();
      formData.append('file', resolvedFile);

      const response = await api.post('/media_summary', formData, {
        timeout: 180000,
      });

      console.log('[SummaryAPI] Response:', response.data);
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

export default api;```

## 6. src/pages/Login.jsx
```jsx
import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { auth } from "../assets/js/firebase.js";
import "../styles/auth.css";
import leftlogo from "../assets/leftlogo.svg";
import acelogo from "../assets/aceLogo.svg";
import orimage from "../assets/orimage.svg";
import googlelogo from "../assets/googlelogo.svg";
import { countries } from "../data/countries";

const FIREBASE_ERRORS = {
  "auth/user-not-found": "No account found with this email address.",
  "auth/wrong-password": "Incorrect password. Please try again.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/user-disabled": "This account has been disabled. Contact support.",
  "auth/network-request-failed": "Network error. Please check your connection.",
  "auth/invalid-verification-code": "Invalid verification code. Please try again.",
  "auth/code-expired": "Verification code expired. Please request a new one.",
};

const getFriendlyError = (err) => {
  const code = err?.code || "";
  return FIREBASE_ERRORS[code] || "Something went wrong. Please try again.";
};

// Phone Input Component extracted for reusability
const PhoneInput = ({ name, placeholder, value, onChange, onCountryChange, defaultCountry = "+1" }) => {
  const [open, setOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState({
    name: "United States",
    code: "+1",
    flag: "🇺🇸",
    iso: "US"
  });
  const [filter, setFilter] = useState("");
  const dropdownRef = useRef(null);

  const filteredCountries = filter.trim() === "" 
    ? countries 
    : countries.filter(c => 
        c.name.toLowerCase().includes(filter.toLowerCase()) ||
        c.code.includes(filter)
      );

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setOpen(false);
    setFilter("");
    if (onCountryChange) {
      onCountryChange(country.code);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!open) return;
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
        setFilter("");
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  return (
    <div className="phone-input" ref={dropdownRef}>
      <div 
        className="country-selector"
        onClick={() => setOpen(!open)}
        role="button"
        tabIndex={0}
      >
        <span className="flag">{selectedCountry.flag}</span>
        <span className="code">{selectedCountry.code}</span>
        <span className="arrow">▾</span>
      </div>

      <input
        className="phone-field"
        type="tel"
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onClick={(e) => e.stopPropagation()}
      />

      {open && (
        <div className="country-dropdown">
          <div className="search">
            <input
              type="text"
              placeholder="Search country..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="country-search"
            />
          </div>
          {filteredCountries.map((country) => (
            <div
              key={country.iso}
              className={`dropdown-item ${selectedCountry.iso === country.iso ? 'selected' : ''}`}
              onClick={() => handleCountrySelect(country)}
            >
              <span className="flag">{country.flag}</span>
              <span className="name">{country.name}</span>
              <span className="code">{country.code}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Login = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("email");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unverifiedUser, setUnverifiedUser] = useState(null);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const previousState = {
      hasDarkClass: root.classList.contains("dark"),
      dataTheme: root.getAttribute("data-theme"),
      bodyDark: body.classList.contains("dark-theme"),
      bodyLight: body.classList.contains("light-theme"),
    };

    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
    body.classList.remove("dark-theme");
    body.classList.add("light-theme");

    return () => {
      if (previousState.hasDarkClass) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }

      if (previousState.dataTheme !== null) {
        root.setAttribute("data-theme", previousState.dataTheme);
      } else {
        root.removeAttribute("data-theme");
      }

      if (previousState.bodyDark) {
        body.classList.add("dark-theme");
      } else {
        body.classList.remove("dark-theme");
      }

      if (previousState.bodyLight) {
        body.classList.add("light-theme");
      } else {
        body.classList.remove("light-theme");
      }
    };
  }, []);
  
  // Email form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Phone form state
  const [phoneStep, setPhoneStep] = useState("INPUT_PHONE");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [phoneInput, setPhoneInput] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError("");
    setUnverifiedUser(null);
    setResendSent(false);
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        // Sign back out — don't grant access to unverified accounts
        await signOut(auth);
        setUnverifiedUser(user);
        setError("Please verify your email before logging in. Check your inbox for the verification link.");
        return;
      }

      const idToken = await user.getIdToken();
      localStorage.setItem("userData", JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || email.split("@")[0],
      }));
      localStorage.setItem("firebase_token", idToken);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedUser) return;
    try {
      await sendEmailVerification(unverifiedUser);
      setResendSent(true);
    } catch (err) {
      console.error("Resend error:", err);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const idToken = await userCredential.user.getIdToken();
      
      const userData = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
      };

      localStorage.setItem("userData", JSON.stringify(userData));
      localStorage.setItem("firebase_token", idToken);
      navigate("/dashboard");
    } catch (err) {
      if (err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") {
        setLoading(false);
        return;
      }
      console.error("Google login error:", err);
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fullPhoneNumber = `${countryCode}${phoneInput.replace(/\D/g, "")}`;
    setPhoneNumber(fullPhoneNumber);

    try {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }

      const recaptchaContainer = document.getElementById("recaptcha-container");
      if (recaptchaContainer) {
        recaptchaContainer.innerHTML = "";
      }

      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {
          console.log("reCAPTCHA solved");
        }
      });

      const confirmation = await signInWithPhoneNumber(auth, fullPhoneNumber, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      setPhoneStep("INPUT_OTP");
    } catch (err) {
      console.error("Phone auth error:", err);
      setError(getFriendlyError(err) || "Failed to send verification code.");
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }

      const recaptchaContainer = document.getElementById("recaptcha-container");
      if (recaptchaContainer) {
        recaptchaContainer.innerHTML = "";
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await confirmationResult.confirm(otp);
      const idToken = await result.user.getIdToken();
      
      const userData = {
        uid: result.user.uid,
        phoneNumber: result.user.phoneNumber,
      };

      localStorage.setItem("userData", JSON.stringify(userData));
      localStorage.setItem("firebase_token", idToken);
      navigate("/dashboard");
    } catch (err) {
      console.error("OTP error:", err);
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header>
        <div className="header-left">
          <img src={acelogo} alt="Ace logo" className="acelogo" />
          <h4>Ace</h4>
        </div>
        <div className="header-right">
          <Link to="/register">
            <button className="signup-button">Create an Account</button>
          </Link>
        </div>
      </header>

      <section id="login-section">
        <div className="login-section-left">
          <img src={leftlogo} alt="Illustration" />
        </div>

        <div className="login-section-right">
          <div className="formdiv">
            <div className="top">
              <h2>
                Login to your <span className="purple">Account</span>
              </h2>
              <p>Please login to your account with your email address or phone number.</p>
            </div>

            <div className="middle">
              <button
                className={`tab-btn ${activeTab === "email" ? "active" : ""}`}
                onClick={() => setActiveTab("email")}
                disabled={loading}
              >
                Email
              </button>
              <button
                className={`tab-btn ${activeTab === "phone" ? "active" : ""}`}
                onClick={() => setActiveTab("phone")}
                disabled={loading}
              >
                Phone
              </button>
            </div>

            <div className="bottom">
              {error && (
                <div className="error-message">
                  {error}
                  {unverifiedUser && (
                    <div style={{ marginTop: "0.6rem" }}>
                      {resendSent ? (
                        <span style={{ color: "#16a34a", fontSize: "0.85rem", fontWeight: 500 }}>
                          ✓ Verification email sent — check your inbox.
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendVerification}
                          style={{ background: "none", border: "none", color: "#7c5cff", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                        >
                          Resend verification email
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              <div className="form-slider">
                <div 
                  className="form-panels"
                  style={{ transform: activeTab === "phone" ? "translateX(-50%)" : "translateX(0)" }}
                >
                  {/* Email Panel */}
                  <div className="panel">
                    <form onSubmit={handleEmailLogin}>
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        required
                      />
                      
                      <div className="password-input-wrapper">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={loading}
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={loading}
                        >
                          {showPassword ? "Hide" : "Show"}
                        </button>
                      </div>

                      <button
                        className="submit-button"
                        type="submit"
                        disabled={loading}
                      >
                        {loading ? "Logging in..." : "Login"}
                      </button>

                      <div className="orimage-div">
                        <img src={orimage} alt="or" className="orimage" />
                      </div>

                      <button
                        type="button"
                        className="googlebutton"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                      >
                        <img src={googlelogo} alt="Google" />
                        Sign in with Google
                      </button>
                    </form>
                  </div>

                  {/* Phone Panel */}
                  <div className="panel">
                    <div id="recaptcha-container"></div>
                    
                    {phoneStep === "INPUT_PHONE" ? (
                      <form onSubmit={handlePhoneSubmit}>
                        <PhoneInput
                          name="phone"
                          placeholder="Phone number"
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          onCountryChange={setCountryCode}
                        />
                        
                        <button
                          className="submit-button"
                          type="submit"
                          disabled={loading}
                        >
                          {loading ? "Sending..." : "Send Verification Code"}
                        </button>

                        <div className="orimage-div">
                          <img src={orimage} alt="or" className="orimage" />
                        </div>

                        <button
                          type="button"
                          className="googlebutton"
                          onClick={handleGoogleLogin}
                          disabled={loading}
                        >
                          <img src={googlelogo} alt="Google" />
                          Sign in with Google
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyCode}>
                        <div className="otp-container">
                          <p>Enter the 6-digit code sent to<br /><b>{phoneNumber}</b></p>
                          <input
                            className="otp-input"
                            type="text"
                            placeholder="123456"
                            maxLength="6"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                            disabled={loading}
                          />
                        </div>
                        
                        <button
                          className="submit-button"
                          type="submit"
                          disabled={loading}
                        >
                          {loading ? "Verifying..." : "Verify Code"}
                        </button>
                        
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            setPhoneStep("INPUT_PHONE");
                            setOtp("");
                            setError("");
                          }}
                          disabled={loading}
                        >
                          Back to Phone Number
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="login-footer">
        <p>© 2025 Ace Inc. All Rights Reserved.</p>
      </footer>
    </>
  );
};

export default Login;```

## 7. src/pages/Register.jsx
```jsx
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "../assets/js/firebase.js";
import "../styles/auth.css";
import leftlogo from "../assets/leftlogo.svg";
import acelogo from "../assets/aceLogo.svg";
import orimage from "../assets/orimage.svg";
import googlelogo from "../assets/googlelogo.svg";
import { 
  FaUser, 
  FaCalendar, 
  FaVenusMars, 
  FaEnvelope, 
  FaLock, 
  FaBook, 
  FaGraduationCap, 
  FaUniversity, 
  FaBuilding 
} from "react-icons/fa";
import { countries } from "../data/countries";

// Use the same PhoneInput component as Login.jsx
const PhoneInput = ({ name, placeholder, value, onChange, onCountryChange, defaultCountry = "+1" }) => {
  const [open, setOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState({
    name: "Nigeria",
    code: "+234",
    flag: "🇳🇬",
    iso: "NG"
  });
  const [filter, setFilter] = useState("");
  const dropdownRef = useRef(null);
  
  const filteredCountries = filter.trim() === "" 
    ? countries 
    : countries.filter(c => 
        c.name.toLowerCase().includes(filter.toLowerCase()) ||
        c.code.includes(filter)
      );

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setOpen(false);
    setFilter("");
    if (onCountryChange) {
      onCountryChange(country.code, country.iso);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!open) return;
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
        setFilter("");
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  return (
    <div className="phone-input" ref={dropdownRef}>
      <div 
        className="country-selector"
        onClick={() => setOpen(!open)}
        role="button"
        tabIndex={0}
      >
        <span className="flag">{selectedCountry.flag}</span>
        <span className="code">{selectedCountry.code}</span>
        <span className="arrow">▾</span>
      </div>

      <input
        className="phone-field"
        type="tel"
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onClick={(e) => e.stopPropagation()}
      />

      {open && (
        <div className="country-dropdown">
          <div className="search">
            <input
              type="text"
              placeholder="Search country..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="country-search"
            />
          </div>
          {filteredCountries.map((country) => (
            <div
              key={country.iso}
              className={`dropdown-item ${selectedCountry.iso === country.iso ? 'selected' : ''}`}
              onClick={() => handleCountrySelect(country)}
            >
              <span className="flag">{country.flag}</span>
              <span className="name">{country.name}</span>
              <span className="code">{country.code}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const previousState = {
      hasDarkClass: root.classList.contains("dark"),
      dataTheme: root.getAttribute("data-theme"),
      bodyDark: body.classList.contains("dark-theme"),
      bodyLight: body.classList.contains("light-theme"),
    };

    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
    body.classList.remove("dark-theme");
    body.classList.add("light-theme");

    return () => {
      if (previousState.hasDarkClass) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }

      if (previousState.dataTheme !== null) {
        root.setAttribute("data-theme", previousState.dataTheme);
      } else {
        root.removeAttribute("data-theme");
      }

      if (previousState.bodyDark) {
        body.classList.add("dark-theme");
      } else {
        body.classList.remove("dark-theme");
      }

      if (previousState.bodyLight) {
        body.classList.add("light-theme");
      } else {
        body.classList.remove("light-theme");
      }
    };
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    date_of_birth: "",
    gender: "",
    phone_number: "",
    phone_country_code: "+234",
    country: "NG",
    subject: "",
    course_of_study: "",
    school_type: "",
    school_name: "",
    degree: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    setLoading(true);

    try {
      // Firebase registration
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      
      const idToken = await userCredential.user.getIdToken();

      // Prepare data for backend
      const backendData = {
        name: formData.name,
        email: formData.email,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        phone_number: formData.phone_country_code + formData.phone_number.replace(/\D/g, ""),
        country: formData.country,
        subject: formData.subject,
        course_of_study: formData.course_of_study,
        school_type: formData.school_type,
        school_name: formData.school_name,
        degree: formData.degree
      };

      // Send to backend
      const response = await fetch("https://student-success-backend.onrender.com/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify(backendData)
      });

      const data = await response.json();

      if (response.ok) {
        // Send email verification before granting access
        await sendEmailVerification(userCredential.user);
        // Sign out immediately — user must verify email before logging in
        await signOut(auth);
        localStorage.removeItem("userData");
        localStorage.removeItem("firebase_token");
        setRegistered(true);
      } else {
        throw new Error(data.message || "Registration failed");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const idToken = await userCredential.user.getIdToken();
      
      const userData = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
      };

      localStorage.setItem("userData", JSON.stringify(userData));
      localStorage.setItem("firebase_token", idToken);
      navigate("/dashboard");
    } catch (err) {
      console.error("Google login error:", err);
      setError(err.message || "Google login failed.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
      <header>
        <div className="header-left">
          <img src={acelogo} alt="Ace logo" className="acelogo" />
          <h4>Ace</h4>
        </div>
        <div className="header-right">
          <Link to="/">
            <button className="signup-button">Sign In</button>
          </Link>
        </div>
      </header>

      <section className="register-section">
        <div className="register-section-left">
          <img src={leftlogo} alt="Illustration" />
        </div>

        <div className="register-container">
          <div className="formdiv">
            {registered ? (
              <div className="verify-email-screen">
                <div className="verify-email-icon">📧</div>
                <h2>Check your email</h2>
                <p>
                  We sent a verification link to <strong>{formData.email}</strong>.
                  Click the link in that email to activate your account, then log in.
                </p>
                <Link to="/">
                  <button className="submit-button" style={{ marginTop: "1.5rem" }}>
                    Go to Login
                  </button>
                </Link>
              </div>
            ) : (
            <>
            <div className="top">
              <h2>
                Create your <span className="purple">Account</span>
              </h2>
              <p>Fill in your details to create your account and start your learning journey.</p>
            </div>

            <div className="bottom">
              <form onSubmit={handleSubmit} className="register-form">
                {error && <div className="error-message">{error}</div>}
                
                  {/* ── Row 1: Name + Date of Birth ── */}
                  <div className="form-grid">
                    <div className="form-field">
                      <div className="input-group">
                        <FaUser className="input-icon" />
                        <input
                          type="text"
                          name="name"
                          placeholder="Full Name *"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="form-field">
                      <div className="input-group">
                        <FaCalendar className="input-icon" />
                        <input
                          type="date"
                          name="date_of_birth"
                          value={formData.date_of_birth}
                          onChange={handleChange}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Row 2: Gender (full width) ── */}
                  <div className="form-grid">
                    <div className="form-field form-field-full">
                      <div className="input-group">
                        <FaVenusMars className="input-icon" />
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          required
                          disabled={loading}
                          className="styled-select"
                        >
                          <option value="">Gender *</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* ── Row 3: Phone + Verification ── */}
                  <div className="form-grid">
                    <div className="form-field form-field-full">
                      <PhoneInput
                        name="phone_number"
                        placeholder="Phone Number *"
                        value={formData.phone_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                        onCountryChange={(code, iso) => {
                          setFormData(prev => ({
                            ...prev,
                            phone_country_code: code,
                            country: iso
                          }));
                        }}
                        defaultCountry="+234"
                      />
                    </div>
                  </div>

                  {/* ── Row 4: Email (full width) ── */}
                  <div className="form-grid">
                    <div className="form-field form-field-full">
                      <div className="input-group">
                        <FaEnvelope className="input-icon" />
                        <input
                          type="email"
                          name="email"
                          placeholder="Email Address *"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Row 5: Password (full width) ── */}
                  <div className="form-grid">
                    <div className="form-field form-field-full">
                      <div className="password-input-wrapper">
                        <FaLock className="input-icon" />
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          placeholder="Password * (min. 6 characters)"
                          value={formData.password}
                          onChange={handleChange}
                          required
                          minLength="6"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={loading}
                        >
                          {showPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── Row 6: Subject + Course of Study ── */}
                  <div className="form-grid">
                    <div className="form-field">
                      <div className="input-group">
                        <FaBook className="input-icon" />
                        <input
                          type="text"
                          name="subject"
                          placeholder="Subject (optional)"
                          value={formData.subject}
                          onChange={handleChange}
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="form-field">
                      <div className="input-group">
                        <FaGraduationCap className="input-icon" />
                        <input
                          type="text"
                          name="course_of_study"
                          placeholder="Course of Study (optional)"
                          value={formData.course_of_study}
                          onChange={handleChange}
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Row 7: School Name + School Type ── */}
                  <div className="form-grid">
                    <div className="form-field">
                      <div className="input-group">
                        <FaUniversity className="input-icon" />
                        <input
                          type="text"
                          name="school_name"
                          placeholder="School Name (optional)"
                          value={formData.school_name}
                          onChange={handleChange}
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="form-field">
                      <div className="input-group">
                        <FaBuilding className="input-icon" />
                        <select
                          name="school_type"
                          value={formData.school_type}
                          onChange={handleChange}
                          disabled={loading}
                          className="styled-select"
                        >
                          <option value="">School Type (optional)</option>
                          <option value="primary">Primary</option>
                          <option value="secondary">Secondary</option>
                          <option value="university">University</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>

                <button
                  className="submit-button"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </button>

                <div className="orimage-div">
                  <img src={orimage} alt="or" className="orimage" />
                </div>

                <button
                  type="button"
                  className="googlebutton"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <img src={googlelogo} alt="Google" />
                  Sign up with Google
                </button>
              </form>
            </div>
            </>
            )}
          </div>
        </div>
      </section>

      <footer className="register-footer">
        <p>© 2025 Ace Inc. All Rights Reserved.</p>
      </footer>
    </>
  );
};

export default Register;```

## 8. src/pages/Dashboard.jsx (excerpt)
_Full file is large (~1400 lines). Below: imports, `renderContent` switch, and main return with `StudyLayout`._
```jsx
// src/pages/Dashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import StudyLayout from "../components/StudyLayout";
import Flashcards from "../components/Flashcard";
import StudyCalendar from "../components/StudyCalendar";
import { Analytics } from "../components/Analytics";
import { Quiz } from "../components/Quiz";
import { Resources } from "../components/Resources";
import { Chatbot } from "../components/Chatbot";
import { Settings } from "../components/Settings";
import {
  analyticsAPI,
  remindersAPI,
  recommendationsAPI,
  activityAPI,
  flashcardAPI,
  dashboardAPI,
} from "../services/apiClient.js";
import "../styles/dashboard.css";
import {
// ... (state, data fetching, dashboard UI — omitted for length) ...
  const renderContent = () => {
    if (currentSection === "flashcards") {
      return <Flashcards />;
    }

    if (currentSection === "calendar") {
      return <StudyCalendar />;
    }

    if (currentSection === "analytics") {
      return <Analytics />;
    }

    if (currentSection === "quiz") {
      return <Quiz />;
    }

    if (currentSection === "resources") {
      return (
        <Resources
          selectedResourceIds={selectedResourceIds}
          setSelectedResourceIds={setSelectedResourceIds}
        />
      );
    }

    if (currentSection === "chatbot") {
      return (
        <Chatbot
          selectedResourceIds={selectedResourceIds}
          setSelectedResourceIds={setSelectedResourceIds}
        />
      );
    }

    if (currentSection === "settings") {
      return <Settings currentUser={currentUser} />;
    }
// ... default dashboard JSX ...
  return (
    <>
      {loading && (
        <div className="dashboard-fullscreen-loader">
          <div className="loader-spinner-wrap">
            <div className="loading-spinner"></div>
          </div>
          <div className={`loader-quote${quoteFading ? " fading" : ""}`}>
            <p className="loader-quote-text">
              "{LOADING_QUOTES[quoteIndex].quote}"
            </p>
            <span className="loader-quote-author">
              — {LOADING_QUOTES[quoteIndex].author}
            </span>
          </div>
          <p className="loader-label">Loading your dashboard…</p>
        </div>
      )}
      <StudyLayout
        currentSection={currentSection}
        onSectionChange={(s) => setCurrentSection(s)}
        notifications={notifications}
        setNotifications={setNotifications}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        currentUser={currentUser}
        onLogout={handleLogout}
      >
        {renderContent()}
      </StudyLayout>
    </>
  );
}

export default Dashboard;
```

---
**End of appendix code bundle.** For `StudyLayout.jsx`, `Flashcard.jsx`, `Resources.jsx`, etc., copy from the repository if your examiner requires additional modules.
