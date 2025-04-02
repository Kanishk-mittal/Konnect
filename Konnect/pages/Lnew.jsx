import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Lnew.css';

const Lnew = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    console.log("Login button clicked");
    navigate('/Login'); // Redirect to login page
  };

  const handleRegister = () => {
    console.log("Register button clicked");
    navigate('/Layout');//redirect to layout  
  };

  return (
    <div className="landing-page">
      <div className="top-nav">
        <img src="https://dashboard.codeparrot.ai/api/image/Z9l_jZIdzXb5OlcP/top-nav.png" alt="Top Nav" />
      </div>

      <div className="content-wrapper">
        <div className="logo">
          <div className="frame-36">
            <span className="kon">KON</span>
            <span className="nect">NECT</span>
          </div>
        </div>

        <div className="card">
          <p className="description">
            Fast, secure, and seamless chat platform built for our college. Stay connected, collaborate effortlessly, and engage with peers in a private and interactive space
          </p>
        </div>

        <div className="auth-buttons">
          <button className="login-btn" onClick={handleLogin}>
            <i className="user-icon">user</i>
            <span>Login</span>
          </button>
          <button className="register-btn" onClick={handleRegister}>
            <i className="user-icon">user</i>
            <span>Register</span>
          </button>
        </div>
      </div>

      <div className="decorative-elements">
        <img src="https://dashboard.codeparrot.ai/api/image/Z9l_jZIdzXb5OlcP/group-14.png" alt="" className="group-14" />
        <img src="https://dashboard.codeparrot.ai/api/image/Z9l_jZIdzXb5OlcP/group-5.png" alt="" className="group-5" />
        <img src="https://dashboard.codeparrot.ai/api/image/Z9l_jZIdzXb5OlcP/group-4.png" alt="" className="group-4" />
        <img src="https://dashboard.codeparrot.ai/api/image/Z9l_jZIdzXb5OlcP/group-1.png" alt="" className="group-1" />
        
        <div className="ellipse ellipse-14"></div>
        <div className="ellipse ellipse-11"></div>
        <div className="ellipse ellipse-15"></div>
        <div className="ellipse ellipse-12"></div>
        <div className="ellipse ellipse-13"></div>
        <div className="ellipse ellipse-9"></div>
      </div>
    </div>
  );
};

export default Lnew;
