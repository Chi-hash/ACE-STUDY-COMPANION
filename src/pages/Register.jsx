// Register.jsx - UPDATED WITH FIREBASE AUTHENTICATION
import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../assets/js/firebase.js";
import "../styles/auth.css";
import leftlogo from "../assets/leftlogo.svg";
import acelogo from "../assets/aceLogo.svg";

// API base URL - configured to the backend provided
const API_BASE_URL = "https://student-success-backend.onrender.com";

// Phone Input Component - EXTRACTED from Register component
const PhoneInput = ({
  name = "phone",
  placeholder = "Phone number",
  onCountryChange,
  onPhoneChange,
  value: controlledValue,
  defaultCountry = "+234",
}) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState({
    code: defaultCountry,
    iso: "NG",
    flag: "🇳🇬",
    name: "Nigeria",
  });
  const [value, setValue] = useState(controlledValue ?? "");
  const [filter, setFilter] = useState("");
  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const wrapRef = useRef(null);
  const hasLoadedRef = useRef(false);

  // Simple default country list
  const defaultCountries = [
    { name: "United States", code: "+1", flag: "🇺🇸", iso: "US" },
    { name: "United Kingdom", code: "+44", flag: "🇬🇧", iso: "GB" },
    { name: "Nigeria", code: "+234", flag: "🇳🇬", iso: "NG" },
    { name: "Canada", code: "+1", flag: "🇨🇦", iso: "CA" },
    { name: "India", code: "+91", flag: "🇮🇳", iso: "IN" },
  ];

  // Close when clicking outside
  React.useEffect(() => {
    function onDoc(e) {
      const clickedInside =
        wrapRef.current && wrapRef.current.contains(e.target);
      if (wrapRef.current && !clickedInside) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const searchRef = useRef(null);
  const inputRef = useRef(null);

  const filtered =
    filter.trim() === ""
      ? countries
      : countries.filter((c) => {
          const q = filter.trim().toLowerCase();
          return (
            c.name.toLowerCase().includes(q) ||
            c.code.includes(q) ||
            c.iso.toLowerCase().includes(q)
          );
        });

  // Load countries on component mount
  React.useEffect(() => {
    let mounted = true;

    async function loadCountries() {
      if (hasLoadedRef.current) return;

      setLoadingCountries(true);
      try {
        // Start with default countries
        const allCountries = [...defaultCountries];

        // Try to fetch additional countries
        try {
          const res = await fetch(
            "https://restcountries.com/v3.1/all?fields=name,cca2,idd"
          );
          if (res.ok) {
            const data = await res.json();
            const mapped = data
              .map((c) => {
                const iso = (c.cca2 || "").toUpperCase();
                if (!iso) return null;

                let dial = "";
                if (c.idd && c.idd.root) {
                  const suffix =
                    Array.isArray(c.idd.suffixes) && c.idd.suffixes.length
                      ? c.idd.suffixes[0]
                      : "";
                  dial = `${c.idd.root}${suffix}`;
                }

                // Skip if already in default countries
                if (defaultCountries.some((dc) => dc.iso === iso)) return null;

                return {
                  name: c.name?.common || "",
                  iso,
                  code: dial || "",
                  flag: isoToFlag(iso),
                };
              })
              .filter((x) => x && x.code && x.name);

            mapped.sort((a, b) => a.name.localeCompare(b.name));
            allCountries.push(...mapped);
          }
        } catch (e) {
          console.log("Using default country list");
        }

        if (mounted) {
          hasLoadedRef.current = true;
          setCountries(allCountries);

          // Set default country
          const defaultCountryObj =
            allCountries.find((c) => c.code === defaultCountry) ||
            allCountries[0];
          if (defaultCountryObj) {
            setSelected(defaultCountryObj);
            if (onCountryChange) {
              onCountryChange(defaultCountryObj.code, defaultCountryObj.iso);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load countries:", e);
        setCountries(defaultCountries);
        setSelected(
          defaultCountries.find((c) => c.code === defaultCountry) ||
            defaultCountries[0]
        );
      } finally {
        if (mounted) setLoadingCountries(false);
      }
    }

    loadCountries();

    return () => {
      mounted = false;
    };
  }, [defaultCountry, onCountryChange]);

  function isoToFlag(iso) {
    if (!iso) return "";
    return iso
      .toUpperCase()
      .replace(/./g, (char) =>
        String.fromCodePoint(127397 + char.charCodeAt(0))
      );
  }

  React.useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current.focus(), 50);
    }
  }, [open]);

  React.useEffect(() => {
    function onKey(e) {
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
      } else if (e.key === "Enter") {
        if (highlighted >= 0 && filtered[highlighted]) {
          const c = filtered[highlighted];
          setSelected(c);
          setOpen(false);
          setFilter("");
          if (onCountryChange) onCountryChange(c.code, c.iso);
        }
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, filtered, highlighted, onCountryChange]);

  // Sync internal value with controlled value
  React.useEffect(() => {
    if (controlledValue !== undefined && controlledValue !== value) {
      setValue(controlledValue);
    }
  }, [controlledValue]);

  const handlePhoneChange = (newValue) => {
    setValue(newValue);
    if (onPhoneChange) {
      onPhoneChange(newValue);
    }
  };

  const handleCountrySelect = (country) => {
    setSelected(country);
    setOpen(false);
    setFilter("");
    if (onCountryChange) {
      onCountryChange(country.code, country.iso);
    }
  };

  return (
    <div className="phone-input" ref={wrapRef}>
      <div
        className={`country-selector ${open ? "open" : ""}`}
        onClick={() => setOpen(!open)}
        role="button"
        tabIndex={0}
      >
        <span className="flag">{selected.flag}</span>
        <span className="code">{selected.code}</span>
        <span className="arrow">▾</span>
      </div>

      <input
        className="phone-field"
        ref={inputRef}
        type="tel"
        inputMode="tel"
        pattern="[0-9+ ()-]*"
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          let v = e.target.value.replace(/[^0-9]/g, "");
          handlePhoneChange(v);
        }}
        onClick={(e) => e.stopPropagation()}
      />

      {open && (
        <ul
          className="country-dropdown visible"
          onClick={(e) => e.stopPropagation()}
        >
          <li className="search">
            <input
              placeholder="Search country or code"
              value={filter}
              ref={searchRef}
              onChange={(e) => setFilter(e.target.value)}
              className="country-search"
            />
          </li>

          {loadingCountries && <li className="loading">Loading countries…</li>}
          {filtered.map((c, i) => (
            <li
              key={c.iso}
              onClick={() => handleCountrySelect(c)}
              className={`${c.iso === selected.iso ? "selected" : ""} ${
                i === highlighted ? "highlighted" : ""
              }`}
            >
              <span className="flag">{c.flag}</span>
              <span className="name">{c.name}</span>
              <span className="code">{c.code}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1); // 1: Firebase, 2: Backend, 3: Complete

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    date_of_birth: "",
    gender: "",
    phone_number: "",
    phone_country_code: "+234",
    subject: "",
    course_of_study: "",
    country: "NG",
    school_type: "",
    school_name: "",
    degree: "",
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
    setError("");
  };

  const handlePhoneCountryChange = (code, iso) => {
    setFormData((prev) => ({
      ...prev,
      phone_country_code: code,
      country: iso,
    }));
  };

  const handlePhoneChange = (phone) => {
    setFormData((prev) => ({
      ...prev,
      phone_number: phone,
    }));
  };

  const validateForm = () => {
    // Check required fields
    const requiredFields = [
      "name",
      "date_of_birth",
      "gender",
      "email",
      "password",
    ];
    const missingFields = requiredFields.filter(
      (field) => !formData[field].trim()
    );

    if (missingFields.length > 0) {
      setError(
        `Please fill in all required fields: ${missingFields.join(", ")}`
      );
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }

    // Validate password length (Firebase requires at least 6 chars)
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }

    // Validate date of birth
    const dob = new Date(formData.date_of_birth);
    const today = new Date();
    if (dob >= today) {
      setError("Date of birth must be in the past");
      return false;
    }

    // Validate phone number if provided
    if (formData.phone_number && formData.phone_number.length < 7) {
      setError("Please enter a valid phone number");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setStep(1);

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // STEP 1: Create user in Firebase Authentication
      setStep(1); // Firebase step
      console.log("Step 1: Creating Firebase user...");

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim().toLowerCase(),
        formData.password
      );

      // STEP 2: Get Firebase ID Token (required for API)
      const idToken = await userCredential.user.getIdToken();
      console.log("Firebase ID Token obtained");
      console.log("Firebase User UID:", userCredential.user.uid);

      // STEP 3: Prepare data for your backend API
      setStep(2); // Backend step
      console.log("Step 2: Registering with backend...");

      const rawPhone =
        formData.phone_country_code +
        formData.phone_number.replace(/[^0-9]/g, "");

      const submitData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        phone_number: rawPhone,
        country: formData.country || "NG",
      };

      // Add optional fields if provided
      if (formData.subject.trim()) {
        submitData.subject = formData.subject.includes(",")
          ? formData.subject.split(",").map((s) => s.trim())
          : formData.subject.trim();
      }
      if (formData.course_of_study.trim())
        submitData.course_of_study = formData.course_of_study.trim();
      if (formData.school_type) submitData.school_type = formData.school_type;
      if (formData.school_name.trim())
        submitData.school_name = formData.school_name.trim();
      if (formData.degree) submitData.degree = formData.degree;

      // STEP 4: Send to backend WITH Firebase ID Token in Authorization header
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`, // Firebase token
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();
      console.log("Backend response:", data);

      if (response.ok && data.ok) {
        // STEP 5: Success - redirect immediately to dashboard
        setStep(3); // Complete step
        console.log("Step 3: Registration complete, redirecting...");

        // Store user info for immediate use
        const userData = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          name: formData.name.trim(),
          ...data.user, // Include any additional user data from backend
        };

        localStorage.setItem("userData", JSON.stringify(userData));
        localStorage.setItem("authToken", idToken);

        // Show success message briefly
        setSuccess(true);

        // Redirect to dashboard immediately (no delay)
        navigate("/dashboard");
      } else {
        // If backend fails, delete the Firebase user to keep data consistent
        try {
          await userCredential.user.delete();
          console.log("Deleted Firebase user due to backend failure");
        } catch (deleteError) {
          console.error("Failed to delete Firebase user:", deleteError);
        }

        setError(
          data.message || data.error || "Registration failed. Please try again."
        );
      }
    } catch (err) {
      console.error("Registration error:", err);

      // Firebase-specific error handling
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered. Please sign in instead.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address format.");
      } else if (err.code === "auth/operation-not-allowed") {
        setError(
          "Email/password authentication is not enabled. Please contact support."
        );
      } else if (err.code === "auth/network-request-failed") {
        setError("Network error. Please check your connection.");
      } else {
        setError(err.message || "An error occurred. Please try again.");
      }
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
          <img src={leftlogo} alt="illustration" />
        </div>

        <div className="register-container">
          <div className="formdiv">
            <div className="top">
              <h2>
                Create your <span className="purple">Account</span>
              </h2>
              <p>
                Fill in your details to create your account and start your
                learning journey.
              </p>
            </div>

            <div className="bottom">
              {loading ? (
                // Loading State
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    maxWidth: "500px",
                    margin: "0 auto",
                  }}
                >
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                    {step === 1 ? "🔐" : step === 2 ? "🔄" : "✅"}
                  </div>
                  <h3 style={{ color: "#334155", marginBottom: "12px" }}>
                    {step === 1 && "Creating Firebase Account..."}
                    {step === 2 && "Registering with Backend..."}
                    {step === 3 && "Registration Complete!"}
                  </h3>
                  <div
                    style={{
                      width: "100%",
                      height: "4px",
                      backgroundColor: "#e2e8f0",
                      borderRadius: "2px",
                      margin: "20px 0",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${step * 33.33}%`,
                        height: "100%",
                        backgroundColor: "#7c5cff",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                  <p style={{ color: "#64748b", marginBottom: "8px" }}>
                    {step === 1 &&
                      "Securely creating your authentication credentials..."}
                    {step === 2 && "Setting up your account in our database..."}
                    {step === 3 && "Redirecting you to your dashboard..."}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: "8px",
                      marginTop: "20px",
                    }}
                  >
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        backgroundColor: step >= 1 ? "#7c5cff" : "#cbd5e1",
                      }}
                    />
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        backgroundColor: step >= 2 ? "#7c5cff" : "#cbd5e1",
                      }}
                    />
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        backgroundColor: step >= 3 ? "#7c5cff" : "#cbd5e1",
                      }}
                    />
                  </div>
                </div>
              ) : success ? (
                // Success State (briefly shown before redirect)
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    backgroundColor: "#f0f9ff",
                    borderRadius: "12px",
                    border: "1px solid #7dd3fc",
                    maxWidth: "500px",
                    margin: "0 auto",
                  }}
                >
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                    ✅
                  </div>
                  <h3 style={{ color: "#0369a1", marginBottom: "12px" }}>
                    Registration Successful!
                  </h3>
                  <p style={{ color: "#0c4a6e", marginBottom: "24px" }}>
                    Your account has been created. Redirecting to dashboard...
                  </p>
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      margin: "20px auto",
                      border: "3px solid #7dd3fc",
                      borderTopColor: "#0369a1",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <style>
                    {`
                      @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                    `}
                  </style>
                </div>
              ) : (
                // Registration Form
                <form
                  onSubmit={handleSubmit}
                  className="register-form"
                  noValidate
                >
                  {error && (
                    <div
                      className="error-message"
                      style={{
                        color: "#ef4444",
                        backgroundColor: "#fef2f2",
                        padding: "12px",
                        borderRadius: "8px",
                        fontSize: "14px",
                        marginBottom: "16px",
                        textAlign: "center",
                        gridColumn: "1 / -1",
                        border: "1px solid #fecaca",
                      }}
                    >
                      {error}
                    </div>
                  )}

                  <div className="form-grid">
                    {/* Required Fields */}
                    <div className="form-field">
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

                    <div className="form-field">
                      <input
                        type="date"
                        name="date_of_birth"
                        placeholder="Date of Birth *"
                        value={formData.date_of_birth}
                        onChange={handleChange}
                        required
                        max={new Date().toISOString().split("T")[0]}
                        disabled={loading}
                      />
                    </div>

                    <div className="form-field">
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        required
                        className="styled-select"
                        aria-label="Gender"
                        disabled={loading}
                      >
                        <option value="">Select Gender *</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not_to_say">
                          Prefer not to say
                        </option>
                      </select>
                    </div>

                    <div className="form-field form-field-full">
                      <label
                        style={{
                          fontSize: "12px",
                          marginBottom: "4px",
                          color: "var(--muted)",
                        }}
                      >
                        Phone Number *
                      </label>
                      <PhoneInput
                        name="phone_number"
                        placeholder="Phone number"
                        value={formData.phone_number}
                        onCountryChange={handlePhoneCountryChange}
                        onPhoneChange={handlePhoneChange}
                        defaultCountry="+234"
                      />
                    </div>

                    <div className="form-field">
                      <input
                        type="email"
                        name="email"
                        placeholder="Email Address *"
                        aria-label="Email Address"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                    </div>

                    <div className="form-field password-input-wrapper">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="Password * (min. 6 characters)"
                        aria-label="Password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        minLength="6"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-pressed={showPassword}
                        disabled={loading}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                      <small
                        style={{
                          fontSize: "11px",
                          color: "#666",
                          marginTop: "4px",
                          display: "block",
                        }}
                      >
                        Your password is securely stored with Firebase
                        Authentication
                      </small>
                    </div>

                    {/* Optional Fields */}
                    <div className="form-field form-field-full">
                      <input
                        type="text"
                        name="subject"
                        placeholder="Subject (optional) - e.g., Math, Science"
                        value={formData.subject}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    </div>

                    <div className="form-field">
                      <input
                        type="text"
                        name="course_of_study"
                        placeholder="Course of Study (optional)"
                        value={formData.course_of_study}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    </div>

                    <div className="form-field">
                      <input
                        type="text"
                        name="school_name"
                        placeholder="School Name (optional)"
                        value={formData.school_name}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    </div>

                    <div className="form-field">
                      <select
                        name="school_type"
                        value={formData.school_type}
                        onChange={handleChange}
                        className="styled-select"
                        aria-label="School Type"
                        disabled={loading}
                      >
                        <option value="">School Type (optional)</option>
                        <option value="primary">Primary</option>
                        <option value="secondary">Secondary</option>
                        <option value="high_school">High School</option>
                        <option value="university">University</option>
                        <option value="college">College</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <select
                        name="degree"
                        value={formData.degree}
                        onChange={handleChange}
                        className="styled-select"
                        aria-label="Degree"
                        disabled={loading}
                      >
                        <option value="">Degree (optional)</option>
                        <option value="bachelor">Bachelor's</option>
                        <option value="master">Master's</option>
                        <option value="phd">PhD</option>
                        <option value="diploma">Diploma</option>
                        <option value="certificate">Certificate</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <button
                    className="submit-button"
                    type="submit"
                    disabled={loading}
                    style={{ gridColumn: "1 / -1", marginTop: "8px" }}
                  >
                    {loading ? (
                      <>
                        <span
                          style={{
                            display: "inline-block",
                            marginRight: "8px",
                          }}
                        >
                          {step === 1 && "🔐"}
                          {step === 2 && "🔄"}
                          {step === 3 && "✅"}
                        </span>
                        {step === 1 && "Creating Firebase Account..."}
                        {step === 2 && "Registering with Backend..."}
                        {step === 3 && "Redirecting..."}
                      </>
                    ) : (
                      "Create Account with Firebase"
                    )}
                  </button>

                  <div
                    style={{
                      textAlign: "center",
                      marginTop: "12px",
                      gridColumn: "1 / -1",
                    }}
                  >
                    <p style={{ fontSize: "13px", color: "var(--muted)" }}>
                      Already have an account?{" "}
                      <Link
                        className="signin"
                        to="/"
                        style={{
                          color: "var(--accent-1)",
                          textDecoration: "none",
                          fontWeight: "500",
                        }}
                      >
                        Sign In
                      </Link>
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="register-footer">
        <p>@2025 Ace Inc. All Rights Reserved.</p>
        <p style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
          Secured with Firebase Authentication
        </p>
      </footer>
    </>
  );
};

export default Register;
