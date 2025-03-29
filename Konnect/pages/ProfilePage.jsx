import React from "react";
import Header from "./Header.jsx";
import profile from "../src/assets/Profilepic.png";
import "./ProfilePage.css";

const ProfilePage = () => {
  return (
    <div className="Back">
      <div className="profile-container">
      <div className="profile-header"><Header /></div>
      <div className="profile-content">
        <img
          src={profile}
          alt="Profile"
          className="profile-picture"
        />
        <h2 className="profile-name">AAru BhAAi</h2>
        <p className="profile-description">
          Lorem Ipsum is simply dummy text of the printing and typesetting industry. 
          Lorem Ipsum has been the industry’s standard.
        </p>

        <div className="profile-details">
          <p><span>Roll Number :</span></p>
          <p><span>E - Mail  :</span></p>
          <p><span>Number :</span></p>
        </div>

        <button className="back-button">Back</button>
      </div>
      </div>
    </div>
  );
};

export default ProfilePage;
