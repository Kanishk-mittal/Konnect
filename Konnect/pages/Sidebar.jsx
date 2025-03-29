import React, { useState } from "react";
import "./Sidebar.css";

const Sidebar = () => {
  const [activeTab, setActiveTab] = useState("personal");

  return (
    <div className="sidebar">
      <div className="tabs">
        <button
          className={`tab ${activeTab === "personal" ? "active" : ""}`}
          onClick={() => setActiveTab("personal")}
        >
          Personal
        </button>
        <button
          className={`tab ${activeTab === "communities" ? "active" : ""}`}
          onClick={() => setActiveTab("communities")}
        >
          Communities
        </button>
      </div>

      <div className="sidebar-content">
        <input type="text" placeholder="Search..." className="search-bar" />

        <div className="chat-list">
          <div className="chat-item selected">
            <img src="../src/assets/profile.png" alt="profile" className="chat-pic" />
            <div className="chat-details">
              <h4>Jane Cooper</h4>
              <p>Yeah sure, tell me zafor</p>
              <span className="chat-time">just now</span>
            </div>
          </div>

          <div className="chat-item">
            <img src="../src/assets/profile.png" alt="profile" className="chat-pic" />
            <div className="chat-details">
              <h4>Jenny Wilson</h4>
              <p>Thank you so much, sir</p>
              <span className="chat-time">2 d</span>
            </div>
          </div>

          <div className="chat-item">
            <img src="../src/assets/profile.png" alt="profile" className="chat-pic" />
            <div className="chat-details">
              <h4>Marvin McKinney</h4>
              <p>You're welcome</p>
              <span className="chat-time">1 m</span>
            </div>
          </div>
          <div className="chat-item">
            <img src="../src/assets/profile.png" alt="profile" className="chat-pic" />
            <div className="chat-details">
              <h4>Jenny Wilson</h4>
              <p>Thank you so much, sir</p>
              <span className="chat-time">2 d</span>
            </div>
          </div>
          <div className="chat-item">
            <img src="../src/assets/profile.png" alt="profile" className="chat-pic" />
            <div className="chat-details">
              <h4>Jenny Wilson</h4>
              <p>Thank you so much, sir</p>
              <span className="chat-time">2 d</span>
            </div>
          </div>
          <div className="chat-item">
            <img src="../src/assets/profile.png" alt="profile" className="chat-pic" />
            <div className="chat-details">
              <h4>Jenny Wilson</h4>
              <p>Thank you so much, sir</p>
              <span className="chat-time">2 d</span>
            </div>
          </div>
          <div className="chat-item">
            <img src="../src/assets/profile.png" alt="profile" className="chat-pic" />
            <div className="chat-details">
              <h4>Jenny Wilson</h4>
              <p>Thank you so much, sir</p>
              <span className="chat-time">2 d</span>
            </div>
          </div>
          <div className="chat-item">
            <img src="../src/assets/profile.png" alt="profile" className="chat-pic" />
            <div className="chat-details">
              <h4>Jenny Wilson</h4>
              <p>Thank you so much, sir</p>
              <span className="chat-time">2 d</span>
            </div>
          </div>
          <div className="chat-item">
            <img src="../src/assets/profile.png" alt="profile" className="chat-pic" />
            <div className="chat-details">
              <h4>Jenny Wilson</h4>
              <p>Thank you so much, sir</p>
              <span className="chat-time">2 d</span>
            </div>
          </div>
          <div className="chat-item">
            <img src="../src/assets/profile.png" alt="profile" className="chat-pic" />
            <div className="chat-details">
              <h4>Jenny Wilson</h4>
              <p>Thank you so much, sir</p>
              <span className="chat-time">2 d</span>
            </div>
          </div>
          <div className="chat-item">
            <img src="../src/assets/profile.png" alt="profile" className="chat-pic" />
            <div className="chat-details">
              <h4>Jenny Wilson</h4>
              <p>Thank you so much, sir</p>
              <span className="chat-time">2 d</span>
            </div>
          </div>
          <div className="chat-item">
            <img src="../src/assets/profile.png" alt="profile" className="chat-pic" />
            <div className="chat-details">
              <h4>Jenny Wilson</h4>
              <p>Thank you so much, sir</p>
              <span className="chat-time">2 d</span>
            </div>
          </div>
          <div className="chat-item">
            <img src="../src/assets/profile.png" alt="profile" className="chat-pic" />
            <div className="chat-details">
              <h4>Jenny Wilson</h4>
              <p>Thank you so much, sir</p>
              <span className="chat-time">2 d</span>
            </div>
          </div>
          <div className="chat-item">
            <img src="../src/assets/profile.png" alt="profile" className="chat-pic" />
            <div className="chat-details">
              <h4>Jenny Wilson</h4>
              <p>Thank you so much, sir</p>
              <span className="chat-time">2 d</span>
            </div>
          </div>
          <div className="chat-item">
            <img src="../src/assets/profile.png" alt="profile" className="chat-pic" />
            <div className="chat-details">
              <h4>Jenny Wilson</h4>
              <p>Thank you so much, sir</p>
              <span className="chat-time">2 d</span>
            </div>
          </div>
          <div className="chat-item">
            <img src="../src/assets/profile.png" alt="profile" className="chat-pic" />
            <div className="chat-details">
              <h4>Jenny Wilson</h4>
              <p>Thank you so much, sir</p>
              <span className="chat-time">2 d</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
