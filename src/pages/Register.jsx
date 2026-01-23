import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
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

  return (
    <div className="phone-input">
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
  const [showPassword, setShowPassword] = useState(false);

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
        // Store user data
        const userData = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          ...data.user
        };

        localStorage.setItem("userData", JSON.stringify(userData));
        localStorage.setItem("firebase_token", idToken);
        
        navigate("/dashboard");
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
            <div className="top">
              <h2>
                Create your <span className="purple">Account</span>
              </h2>
              <p>Fill in your details to create your account and start your learning journey.</p>
            </div>

            <div className="bottom">
              <form onSubmit={handleSubmit} className="register-form">
                {error && <div className="error-message">{error}</div>}
                
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

                    <div className="form-field">
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

                    <div className="form-field">
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

                    <div className="form-field">
                      <div className="password-input-wrapper">
                        <FaLock className="input-icon" />
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          placeholder="Password * (min. 6 chars)"
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
          </div>
        </div>
      </section>

      <footer className="register-footer">
        <p>© 2025 Ace Inc. All Rights Reserved.</p>
      </footer>
    </>
  );
};

export default Register;