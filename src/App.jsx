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
        // User is signed in
        const userData = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email?.split("@")[0] || "Student",
          photoURL: user.photoURL,
          phoneNumber: user.phoneNumber,
          streak: 7, // Default streak
        };

        setCurrentUser(userData);
        setIsAuthenticated(true);

        // Store in localStorage for persistence
        localStorage.setItem("aceit_current_user", JSON.stringify(userData));
        localStorage.setItem("aceit_auth_token", user.accessToken || "");
      } else {
        // User is signed out
        setCurrentUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem("aceit_current_user");
        localStorage.removeItem("aceit_auth_token");
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
