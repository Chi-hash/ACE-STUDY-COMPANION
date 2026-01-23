import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
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

const Login = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("email");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
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
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      
      const userData = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName || email.split("@")[0],
      };

      localStorage.setItem("userData", JSON.stringify(userData));
      localStorage.setItem("firebase_token", idToken);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Login failed. Please try again.");
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

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fullPhoneNumber = `${countryCode}${phoneInput.replace(/\D/g, "")}`;
    setPhoneNumber(fullPhoneNumber);

    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
          callback: () => {
            console.log("reCAPTCHA solved");
          }
        });
      }

      const confirmation = await signInWithPhoneNumber(auth, fullPhoneNumber, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      setPhoneStep("INPUT_OTP");
    } catch (err) {
      console.error("Phone auth error:", err);
      setError(err.message || "Failed to send verification code.");
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
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
      setError("Invalid verification code. Please try again.");
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
              {error && <div className="error-message">{error}</div>}
              
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

export default Login;