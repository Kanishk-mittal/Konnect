import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header.jsx";
import profile from "../src/assets/Profilepic.png";
import "./ProfilePage.css";
import API_BASE_URL from "../Integration/apiConfig.js";

const ProfilePage = () => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        // Always get profile from JWT identity only, using the correct API base URL
        const response = await fetch(`${API_BASE_URL}/get_profile`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Response error:', response.status, errorText);
          throw new Error(`Failed to fetch profile data (Status: ${response.status})`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Invalid response format:', text);
          throw new Error('Server returned non-JSON response');
        }
        
        const data = await response.json();
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
            <p><span>Status :</span> {profileData?.is_online ? 'Online' : 'Offline'}</p>
          </div>

          <button className="back-button" onClick={handleBackClick}>Back</button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
