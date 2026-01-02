import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "../assets/js/firebase.js"; // Make sure this path is correct
import "../styles/auth.css";
import Illustration from "../assets/illustration.svg";
import leftlogo from "../assets/leftlogo.svg";
import acelogo from "../assets/aceLogo.svg";
import orimage from "../assets/orimage.svg";
import googlelogo from "../assets/googlelogo.svg";

const Login = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("email");
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [showPhonePassword, setShowPhonePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const panelsRef = useRef(null);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Simple country list
  const countryList = [
    { name: "United States", code: "+1", flag: "🇺🇸", iso: "US" },
    { name: "United Kingdom", code: "+44", flag: "🇬🇧", iso: "GB" },
    { name: "Nigeria", code: "+234", flag: "🇳🇬", iso: "NG" },
    { name: "Canada", code: "+1", flag: "🇨🇦", iso: "CA" },
    { name: "India", code: "+91", flag: "🇮🇳", iso: "IN" },
  ];

  // Handle email/password login
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Get the Firebase ID token
      const idToken = await userCredential.user.getIdToken();
      console.log("Login successful, ID token obtained");

      // Store user data in localStorage
      const userData = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName || email.split("@")[0],
      };

      localStorage.setItem("userData", JSON.stringify(userData));
      localStorage.setItem("authToken", idToken);

      // Redirect to dashboard
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);

      // Firebase-specific error handling
      if (err.code === "auth/invalid-email") {
        setError("Invalid email address format.");
      } else if (err.code === "auth/user-disabled") {
        setError("This account has been disabled.");
      } else if (err.code === "auth/user-not-found") {
        setError("No account found with this email.");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password. Please try again.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else if (err.code === "auth/network-request-failed") {
        setError("Network error. Please check your connection.");
      } else {
        setError(err.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Google login
  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);

      // Get the Firebase ID token
      const idToken = await userCredential.user.getIdToken();
      console.log("Google login successful, ID token obtained");

      // Store user data in localStorage
      const userData = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        photoURL: userCredential.user.photoURL,
      };

      localStorage.setItem("userData", JSON.stringify(userData));
      localStorage.setItem("authToken", idToken);

      // Redirect to dashboard
      navigate("/dashboard");
    } catch (err) {
      console.error("Google login error:", err);

      if (err.code === "auth/popup-closed-by-user") {
        setError("Google login was cancelled.");
      } else if (err.code === "auth/popup-blocked") {
        setError(
          "Popup was blocked by your browser. Please allow popups for this site."
        );
      } else if (err.code === "auth/network-request-failed") {
        setError("Network error. Please check your connection.");
      } else {
        setError(err.message || "Google login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Phone input component
  function PhoneInput({ name = "phone", placeholder = "Phone number (+1)" }) {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(countryList[0]);
    const [value, setValue] = useState("");
    const [filter, setFilter] = useState("");
    const [countries, setCountries] = useState(countryList);
    const [loadingCountries, setLoadingCountries] = useState(false);
    const [highlighted, setHighlighted] = useState(-1);
    const wrapRef = useRef(null);
    const hasLoadedRef = useRef(false);

    // Close when clicking outside
    React.useEffect(() => {
      function onDoc(e) {
        const path = e.composedPath ? e.composedPath() : null;
        const clickedInside = path
          ? path.includes(wrapRef.current)
          : wrapRef.current && wrapRef.current.contains(e.target);
        if (wrapRef.current && !clickedInside) {
          setOpen(false);
        }
      }
      document.addEventListener("click", onDoc);
      return () => document.removeEventListener("click", onDoc);
    }, []);

    const searchRef = useRef(null);

    const filtered = countries.filter((c) => {
      const q = filter.trim().toLowerCase();
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.includes(q) ||
        c.iso.toLowerCase().includes(q)
      );
    });

    // Preload all countries
    React.useEffect(() => {
      let mounted = true;

      async function loadCountries() {
        if (hasLoadedRef.current) return;

        setLoadingCountries(true);
        try {
          const res = await fetch(
            "https://restcountries.com/v3.1/all?fields=name,cca2,idd"
          );
          if (!res.ok) throw new Error("network");
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

              const existingCountry = countryList.find((ct) => ct.iso === iso);
              const finalCode = existingCountry?.code || dial || "";

              return {
                name: c.name?.common || c.name || "",
                iso,
                code: finalCode,
                flag: isoToFlag(iso),
              };
            })
            .filter((x) => x && x.iso && x.name);

          mapped.sort((a, b) => a.name.localeCompare(b.name));

          if (mounted) {
            hasLoadedRef.current = true;
            setCountries((prev) => {
              const map = new Map();
              mapped.forEach((m) => map.set(m.iso, m));
              prev.forEach((p) => {
                if (!map.has(p.iso)) map.set(p.iso, p);
              });
              const allCountries = Array.from(map.values());

              setSelected((currentSelected) => {
                const updatedCountry = allCountries.find(
                  (c) => c.iso === currentSelected.iso
                );
                return updatedCountry || currentSelected;
              });

              return allCountries;
            });
          }
        } catch (e) {
          console.error("Failed to load countries:", e);
        } finally {
          if (mounted) setLoadingCountries(false);
        }
      }

      loadCountries();

      return () => {
        mounted = false;
      };
    }, []);

    function isoToFlag(iso) {
      if (!iso) return "";
      return iso
        .toUpperCase()
        .replace(/./g, (char) =>
          String.fromCodePoint(127397 + char.charCodeAt(0))
        );
    }

    React.useEffect(() => {
      if (open) {
        setTimeout(() => searchRef.current && searchRef.current.focus(), 50);
      }
    }, [open]);

    React.useEffect(() => {
      function onKey(e) {
        if (!open) return;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setHighlighted((h) => Math.max(h - 1, 0));
        } else if (e.key === "Enter") {
          if (highlighted >= 0 && filtered[highlighted]) {
            const c = filtered[highlighted];
            setSelected(c);
            setOpen(false);
            setFilter("");
          }
        } else if (e.key === "Escape") {
          setOpen(false);
        }
      }
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }, [open, filtered, highlighted]);

    return (
      <div className="phone-input" ref={wrapRef}>
        <div
          className={`country-selector ${open ? "open" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((s) => !s);
          }}
          role="button"
          tabIndex={0}
        >
          <span className="flag">{selected.flag}</span>
          <span className="code">{selected.code}</span>
          <span className="arrow">▾</span>
        </div>

        <input
          className="phone-field"
          type="tel"
          inputMode="tel"
          pattern="[0-9+ ()-]*"
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            let v = e.target.value;
            v = v.replace(/[^0-9+()\s-]/g, "");
            v = v.replace(/(?!^)\+/g, "");
            setValue(v);
          }}
          onPaste={(e) => {
            const pasted = (e.clipboardData || window.clipboardData).getData(
              "text"
            );
            const cleaned = pasted
              .replace(/[^0-9+()\s-]/g, "")
              .replace(/(?!^)\+/g, "");
            e.preventDefault();
            setValue((prev) => (prev + cleaned).slice(0, 30));
          }}
          onClick={(e) => e.stopPropagation()}
        />

        <ul
          className={`country-dropdown ${open ? "visible" : ""}`}
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
              key={c.iso + i}
              onClick={(e) => {
                e.stopPropagation();
                setSelected(c);
                setOpen(false);
                setFilter("");
              }}
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
      </div>
    );
  }

  return (
    <>
      <header>
        <div className="header-left">
          <img src={acelogo} alt="Ace logo" className="acelogo" />
          <h4>Ace</h4>
        </div>
        <div className="header-right">
          <button className="" aria-hidden></button>
          <Link to="/register">
            <button className="signup-button">Create an Account</button>
          </Link>
        </div>
      </header>

      <section id="login-section">
        <div className="login-section-left">
          <img src={leftlogo} alt="illustration" />
        </div>

        <div className="login-section-right">
          <div className="formdiv">
            <div className="top">
              <h2>
                Login to your <span className="purple">Account</span>
              </h2>
              <p>
                Please login to your account with your email address and
                password.
              </p>
            </div>

            <div className="middle">
              <button
                className={`tab-btn ${activeTab === "email" ? "active" : ""}`}
                onClick={() => setActiveTab("email")}
                type="button"
                disabled={loading}
              >
                Email
              </button>
              <button
                className={`tab-btn ${activeTab === "phone" ? "active" : ""}`}
                onClick={() => setActiveTab("phone")}
                type="button"
                disabled={loading}
              >
                Phone
              </button>
            </div>

            <div className="bottom">
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
                    border: "1px solid #fecaca",
                  }}
                >
                  {error}
                </div>
              )}

              <div className="form-slider">
                <div
                  className="form-panels"
                  ref={panelsRef}
                  style={{
                    transform:
                      activeTab === "phone"
                        ? "translateX(-50%)"
                        : "translateX(0)",
                  }}
                >
                  {/* Email Login Panel */}
                  <div className="panel email-panel">
                    <form
                      onSubmit={handleEmailLogin}
                      className="emailform-form"
                    >
                      <input
                        type="email"
                        name="email"
                        id="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                      />

                      <div className="password-input-wrapper">
                        <input
                          type={showEmailPassword ? "text" : "password"}
                          name="password"
                          id="password"
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={loading}
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() =>
                            setShowEmailPassword(!showEmailPassword)
                          }
                          aria-label={
                            showEmailPassword
                              ? "Hide password"
                              : "Show password"
                          }
                          disabled={loading}
                        >
                          {showEmailPassword ? (
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                              <line x1="1" y1="1" x2="23" y2="23"></line>
                            </svg>
                          ) : (
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          )}
                        </button>
                      </div>

                      <p className="forgot">Forgot Password?</p>

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
                        className="googlebutton"
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                      >
                        <img src={googlelogo} alt="google" />
                        {loading ? "Signing in..." : "Sign In with Google"}
                      </button>
                    </form>
                  </div>

                  {/* Phone Login Panel (Currently just UI - Firebase phone auth requires additional setup) */}
                  <div className="panel phone-panel">
                    <form action="" method="post" className="phoneform-form">
                      <PhoneInput name="phone" placeholder="Phone number" />

                      <div className="password-input-wrapper">
                        <input
                          type={showPhonePassword ? "text" : "password"}
                          name="phonepassword"
                          id="phonepassword"
                          placeholder="Password"
                          required
                          disabled={loading}
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() =>
                            setShowPhonePassword(!showPhonePassword)
                          }
                          aria-label={
                            showPhonePassword
                              ? "Hide password"
                              : "Show password"
                          }
                          disabled={loading}
                        >
                          {showPhonePassword ? (
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                              <line x1="1" y1="1" x2="23" y2="23"></line>
                            </svg>
                          ) : (
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          )}
                        </button>
                      </div>

                      <p className="forgot">Forgot Password?</p>

                      <button
                        className="submit-button"
                        type="submit"
                        disabled={true} // Disable phone login for now
                      >
                        Phone Login (Coming Soon)
                      </button>

                      <div className="orimage-div">
                        <img src={orimage} alt="or" className="orimage" />
                      </div>

                      <button
                        className="googlebutton"
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                      >
                        <img src={googlelogo} alt="google" />
                        {loading ? "Signing in..." : "Sign In with Google"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="login-footer">
        <p>@2025 Ace Inc. All Rights Reserved.</p>
      </footer>
    </>
  );
};

export default Login;
