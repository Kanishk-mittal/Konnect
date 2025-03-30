import React, { useState, useContext, useEffect } from "react";
import { AppContext } from "../src/context/AppContext";
import axios from "axios";
import API_BASE_URL from "../Integration/apiConfig.js";
import "./Sidebar.css";

const Sidebar = ({ onSelectChat }) => {
  const [activeTab, setActiveTab] = useState("personal");
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatType, setChatType] = useState(null);
  
  // Get context values for authentication
  const { privateKey, dbKey } = useContext(AppContext);
  
  // Create axios instance with credentials
  const instance = axios.create({
    withCredentials: true,
    baseURL: API_BASE_URL,
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    }
  });
  
  // Function to fetch users from backend
  const fetchUsers = async () => {
    try {
      const response = await instance.get('/get_users');
      setUsers(response.data.users);
    } catch (err) {
      setError('Failed to load users. Please try again later.');
    }
  };

  // Function to fetch user groups from backend
  const fetchGroups = async () => {
    try {
      const response = await instance.get('/get_user_groups');
      setGroups(response.data.groups);
    } catch (err) {
      setError('Failed to load groups. Please try again later.');
    }
  };
  
  // Fetch current user info
  const fetchCurrentUserInfo = async () => {
    try {
      // Extract CSRF token from cookies
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf_access_token='))
        ?.split('=')[1];

      if (!csrfToken) {
        setError("Authentication token not found. Please log in again.");
        return null;
      }

      const response = await instance.post('/protected', {}, {
        headers: { "X-CSRF-TOKEN": csrfToken }
      });
      
      return response.data;
    } catch (err) {
      setError("Failed to authenticate. Please log in again.");
      return null;
    }
  };
  
  // Handle selecting a chat
  const handleSelectChat = (id, type) => {
    setSelectedChat(id);
    setChatType(type);
    
    // If parent component provided a selection handler, call it
    if (onSelectChat) {
      onSelectChat(id, type);
    }
  };
  
  // Fetch data when component mounts
  useEffect(() => {
    // Check if user is authenticated
    if (!privateKey || !dbKey) {
      setError("Authentication required. Please log in.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch current user info first
        const currentUser = await fetchCurrentUserInfo();
        
        if (currentUser) {
          // Then fetch other data in parallel
          await Promise.all([fetchUsers(), fetchGroups()]);
          setError(null);
        }
      } catch (err) {
        // Error already handled in individual fetch functions
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [privateKey, dbKey]);
  
  // Filter users and groups based on search term
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.roll_number.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <input 
          type="text" 
          placeholder="Search..." 
          className="search-bar" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {loading ? (
          <div className="loading-indicator">Loading...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <div className="chat-list">
            {activeTab === "personal" ? (
              filteredUsers.length === 0 ? (
                <div className="no-results">No users found</div>
              ) : (
                filteredUsers.map(user => (
                  <div 
                    key={user.roll_number}
                    className={`chat-item ${selectedChat === user.roll_number && chatType === 'user' ? 'selected' : ''}`}
                    onClick={() => handleSelectChat(user.roll_number, 'user')}
                  >
                    <img src="../src/assets/profile.png" alt="profile" className="chat-pic" />
                    <div className="chat-details">
                      <h4>{user.name}</h4>
                      <p>{user.roll_number}</p>
                      <span className="chat-time">
                        {user.is_online ? "Online" : "Offline"}
                      </span>
                    </div>
                  </div>
                ))
              )
            ) : (
              filteredGroups.length === 0 ? (
                <div className="no-results">No groups found</div>
              ) : (
                filteredGroups.map(group => (
                  <div 
                    key={group.id}
                    className={`chat-item ${selectedChat === group.id && chatType === 'group' ? 'selected' : ''}`}
                    onClick={() => handleSelectChat(group.id, 'group')}
                  >
                    <img src="../src/assets/profile.png" alt="profile" className="chat-pic" />
                    <div className="chat-details">
                      <h4>{group.name}</h4>
                      <p>{group.description || 'No description'}</p>
                      <span className="chat-time">{group.role}</span>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
