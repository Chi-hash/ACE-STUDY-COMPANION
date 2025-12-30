import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/auth.css";

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Add registration logic here
    console.log("Registration data:", formData);
    // Navigate to dashboard or login after successful registration
    // navigate("/dashboard");
  };

  return (
    <section id="register-section" className="register-section">
      <div className="login-container register-container">
        <div className="login-left">
          <div className="login-left-content">
            <div className="feature-top">
              <h3>ACE Study Companion</h3>
              <p>Your ultimate study partner for academic success.</p>
            </div>
            {/* feature 1 */}
            <div className="feature1 feature">
              <div className="left">
                <svg
                  width="100"
                  height="100"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="3"
                    y="5"
                    width="14"
                    height="10"
                    rx="2"
                    stroke="currentColor"
                    stroke-width="1.5"
                  />
                  <rect
                    x="7"
                    y="9"
                    width="14"
                    height="10"
                    rx="2"
                    fill="currentColor"
                    fill-opacity="0.2"
                    stroke="currentColor"
                    stroke-width="1.5"
                  />
                  <path
                    d="M17 3L17.5 4.5L19 5L17.5 5.5L17 7L16.5 5.5L15 5L16.5 4.5L17 3Z"
                    fill="#f97316"
                  />
                </svg>
              </div>
              <div className="right">
                <h4>AI Flashcard Generation</h4>
                <p>Generate flashcards using AI-powered technology</p>
              </div>
            </div>
            {/* feature 2 */}
            <div className="feature1 feature">
              <div className="left">
                <svg
                  width="100"
                  height="100"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9 11L12 14L22 4"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M21 12V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H12"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                  <path
                    d="M14 7L11 11H17L14 15"
                    stroke="#f97316"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <div className="right">
                <h4>AI Quiz Generation</h4>
                <p>Generate quizzes using AI-powered technology</p>
              </div>
            </div>
            {/* feature 3 */}
            <div className="feature1 feature">
              <div className="left">
                <svg
                  width="100"
                  height="100"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20 10V17C20 19.2091 18.2091 21 16 21H8C5.79086 21 4 19.2091 4 17V7C4 4.79086 5.79086 3 8 3H10L12 5H16C18.2091 5 20 6.79086 20 9"
                    stroke="currentColor"
                    stroke-width="1.5"
                  />
                  <circle
                    cx="12"
                    cy="13"
                    r="3"
                    stroke="currentColor"
                    stroke-width="1.5"
                  />
                  <path
                    d="M12 11V13L13.5 14"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                </svg>
              </div>
              <div className="right">
                <h4>Resource Storage</h4>
                <p>Store and manage all your study resources in one place</p>
              </div>
            </div>
            {/* feature 4 */}
            <div className="feature1 feature">
              <div className="left">
                <svg
                  width="100"
                  height="100"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="3"
                    y="11"
                    width="18"
                    height="10"
                    rx="4"
                    stroke="currentColor"
                    stroke-width="1.5"
                  />
                  <path
                    d="M12 11V7M12 7L9 4M12 7L15 4"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                  <circle cx="8" cy="16" r="1" fill="currentColor" />
                  <circle cx="16" cy="16" r="1" fill="currentColor" />
                  <path
                    d="M10 19C10 19 11 20 12 20C13 20 14 19 14 19"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                </svg>
              </div>
              <div className="right">
                <h4>AI ChatBot</h4>
                <p>Chat with an AI assistant for study help</p>
              </div>
            </div>
            {/* feature 5 */}
            <div className="feature1 feature">
              <div className="left">
                <svg
                  width="100"
                  height="100"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="3"
                    y="4"
                    width="18"
                    height="17"
                    rx="2"
                    stroke="currentColor"
                    stroke-width="1.5"
                  />
                  <path d="M3 9H21" stroke="currentColor" stroke-width="1.5" />
                  <path
                    d="M8 2V6M16 2V6"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                  <rect
                    x="7"
                    y="13"
                    width="2"
                    height="2"
                    rx="0.5"
                    fill="currentColor"
                  />
                  <rect
                    x="11"
                    y="13"
                    width="2"
                    height="2"
                    rx="0.5"
                    fill="currentColor"
                    fill-opacity="0.3"
                  />
                  <rect
                    x="15"
                    y="13"
                    width="2"
                    height="2"
                    rx="0.5"
                    fill="currentColor"
                    fill-opacity="0.3"
                  />
                </svg>
              </div>
              <div className="right">
                <h4>Study Schedule</h4>
                <p>Plan and manage your study sessions effectively</p>
              </div>
            </div>
            {/* feature 6 */}
            <div className="feature1 feature">
              <div className="left">
                <svg
                  width="100"
                  height="100"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 20H21"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                  <path
                    d="M3 16L8 11L13 13L21 5"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <circle cx="21" cy="5" r="2" fill="#10b981" />
                </svg>
              </div>
              <div className="right">
                <h4>Predictive Model (Analytics)</h4>
                <p>Get insights and predictions based on your study patterns</p>
              </div>
            </div>
          </div>
        </div>
        <div className="login-right">
          <div className="login-right-content">
            <form onSubmit={handleSubmit}>
              <div className="login-right-content-top">
                <h3>Register an Account</h3>
                <p>Create your account to start your learning journey</p>
              </div>
              <div className="login-right-content-namediv lab-input">
                <label htmlFor="fullName">Full Name</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div className="login-right-content-emaildiv lab-input">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                />
              </div>
              <div className="login-right-content-passworddiv lab-input">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                />
              </div>
              <div className="login-right-content-passworddiv lab-input">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  required
                />
              </div>
              <div className="login-right-content-remember">
                <div className="left remember-content">
                  <input
                    type="checkbox"
                    name="acceptTerms"
                    id="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    required
                  />
                  <label htmlFor="acceptTerms">
                    I accept the Terms and Conditions
                  </label>
                </div>
              </div>
              <div className="login-button">
                <button type="submit">Register</button>
              </div>
              <div className="no-account">
                <p>
                  Already have an account? <Link to="/">Sign In</Link>
                </p>
              </div>
            </form>
            <hr />
            <div className="terms">
              <div className="left">
                <a href="#">Terms and Conditions</a>
              </div>
              <div className="right">
                <a href="#">Privacy Policy</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Register;
