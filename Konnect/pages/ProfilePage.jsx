import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header.jsx";
import profile from "../src/assets/Profilepic.png";
import "./ProfilePage.css";
import API_BASE_URL from "../Integration/apiConfig.js";
import { getData } from "../Integration/apiService.js";

const ProfilePage = () => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        // Use the getData function from apiService.js to make the request
        const data = await getData('/get_profile');
        setProfileData(data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfileData();
  }, []);
  
  const handleBackClick = () => {
    navigate(-1); // Go back to previous page
  };
  
  if (loading) {
    return (
      <div className="Back">
        <div className="profile-container">
          <div className="profile-header"><Header /></div>
          <div className="profile-content">
            <p>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="Back">
      <div className="profile-container">
        <div className="profile-header"><Header /></div>
        <div className="profile-content">
          <img
            src={profileData?.profile_pic ? `data:image/jpeg;base64,${profileData.profile_pic}` : profile}
            alt="Profile"
            className="profile-picture"
          />
          <h2 className="profile-name">{profileData?.name || 'User'}</h2>
          <p className="profile-description">
            {profileData?.description || `I am ${profileData?.name || 'a user'} and a student at IIIT Kottayam`}
          </p>

          <div className="profile-details">
            <p><span>Roll Number :</span> {profileData?.roll_number}</p>
            <p><span>E - Mail  :</span> {profileData?.email}</p>
          </div>

          <button className="back-button" onClick={handleBackClick}>Back</button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
