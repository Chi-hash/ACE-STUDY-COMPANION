import React from "react";
import "../styles/auth.css";
import Illustration from "../assets/illustration.svg";
import leftlogo from "../assets/leftlogo.svg";
import acelogo from "../assets/aceLogo.svg";
import orimage from "../assets/orimage.svg";
import googlelogo from "../assets/googlelogo.svg";

const Login = () => {
  return (
    <>
      <header>
        <div className="header-left">
          <img src={acelogo} alt="" className="acelogo" />
          <h4>Ace</h4>
        </div>
        <div className="header-right">
          <button className=""></button>
          <button className="signup-button">Create an Account</button>
        </div>
      </header>
      <section id="login-section">
        <div className="login-section-left">
          <img src={leftlogo} alt="" />
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
              <p className="active">Email</p>
              <p>Phone</p>
            </div>
            <div className="bottom">
              <div className="emailform">
                <form action="" method="post" className="emailform-form">
                  <input
                    type="email"
                    name="email"
                    id="email"
                    placeholder="Email Address"
                    required
                  />
                  <input
                    type="password"
                    name="password"
                    id="password"
                    placeholder="Password"
                    required
                  />
                  <p>Forgot Password?</p>
                  <button className="submit-button" type="submit">
                    Login
                  </button>
                  <div className="orimage-div">
                    <img src={orimage} alt="" className="orimage" />
                  </div>
                  <button className="googlebutton">
                    <img src={googlelogo} alt="" />
                    Sign In with Google
                  </button>
                </form>
              </div>
              <div className="phoneform"></div>
            </div>
          </div>
        </div>
      </section>
      <footer>
        <p>@2025 Ace Inc. All Rights Reserved.</p>
      </footer>
    </>
  );
};

export default Login;
