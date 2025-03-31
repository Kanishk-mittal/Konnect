import React, { useState, useContext, useEffect, useRef } from "react";
import { AppContext } from "../src/context/AppContext";
import axios from "axios";
import API_BASE_URL from "../Integration/apiConfig.js";
import { io } from "socket.io-client";
import { getAllUnreadCounts } from "./ChatUtils.jsx";
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
  const [unreadCounts, setUnreadCounts] = useState({});
  
  // Database reference
  const dbRef = useRef(null);
  // Socket reference
  const socketRef = useRef(null);
  
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
  
  // Initialize IndexedDB
  const initializeDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('messagesDB', 1);
      
      request.onerror = (event) => {
        reject('Error opening database');
      };
      
      request.onsuccess = (event) => {
        dbRef.current = event.target.result;
        resolve(event.target.result);
      };
    });
  };
  
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
  
  // Fetch unread counts from IndexedDB
  const fetchUnreadCounts = async (currentUser) => {
    try {
      if (dbRef.current && currentUser) {
        const counts = await getAllUnreadCounts(dbRef.current, currentUser.logged_in_as);
        setUnreadCounts(counts);
      }
    } catch (err) {
      console.error('Failed to load unread counts:', err);
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
  
  // Set up socket connection to listen for new messages
  const setupSocketConnection = (currentUser) => {
    if (!currentUser) return;
    
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    try {
      socketRef.current = io('http://localhost:5000', {
        withCredentials: true
      });
      
      socketRef.current.emit('join', { room: currentUser.logged_in_as });
      
      socketRef.current.on('receive_message', () => {
        // Update unread counts when a new message is received
        fetchUnreadCounts(currentUser);
      });
      
    } catch (error) {
      console.error("Socket connection error:", error);
    }
  };
  
  // Handle selecting a chat
  const handleSelectChat = (id, type) => {
    setSelectedChat(id);
    setChatType(type);
    
    // Clear unread count for this chat
    if (unreadCounts[id]) {
      const newUnreadCounts = { ...unreadCounts };
      delete newUnreadCounts[id];
      setUnreadCounts(newUnreadCounts);
      
      // Wait a moment for IndexedDB to update, then refresh counts
      setTimeout(() => fetchUnreadCounts(currentUser), 500);
    }
    
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
        // Initialize database first
        await initializeDB();
        
        // Fetch current user info
        const currentUser = await fetchCurrentUserInfo();
        
        if (currentUser) {
          // Set up socket connection
          setupSocketConnection(currentUser);
          
          // Then fetch other data in parallel
          await Promise.all([
            fetchUsers(),
            fetchGroups(),
            fetchUnreadCounts(currentUser)
          ]);
          
          setError(null);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Error loading data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Set up interval to refresh unread counts
    const interval = setInterval(() => {
      fetchCurrentUserInfo().then(currentUser => {
        if (currentUser) {
          fetchUnreadCounts(currentUser);
        }
      });
    }, 10000); // Refresh every 10 seconds
    
    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [privateKey, dbKey]);
  
  // Add message read event listener
  useEffect(() => {
    // Listen for messagesRead events from ChatWindow
    const handleMessagesRead = (event) => {
      const { chatId, type } = event.detail;
      // Update unread counts when messages are read
      fetchCurrentUserInfo().then(currentUser => {
        if (currentUser) {
          fetchUnreadCounts(currentUser);
        }
      });
    };
    
    window.addEventListener('messagesRead', handleMessagesRead);
    
    return () => {
      window.removeEventListener('messagesRead', handleMessagesRead);
    };
  }, []);
  
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
                      <div className="chat-name-container">
                        <h4>{user.name}</h4>
                        {unreadCounts[user.roll_number] && unreadCounts[user.roll_number].count > 0 && (
                          <span className="unread-badge">{unreadCounts[user.roll_number].count}</span>
                        )}
                      </div>
                      <p>{user.roll_number}</p>
                      <span className="chat-time">
                        {unreadCounts[user.roll_number] && unreadCounts[user.roll_number].count > 0 ? (
                          <span className="online-indicator unread"></span>
                        ) : (
                          user.is_online ? <span className="online-indicator"></span> : "Offline"
                        )}
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
                      <div className="chat-name-container">
                        <h4>{group.name}</h4>
                        {unreadCounts[group.id] && unreadCounts[group.id].count > 0 && (
                          <span className="unread-badge">{unreadCounts[group.id].count}</span>
                        )}
                      </div>
                      <p>{group.description || 'No description'}</p>
                      <span className="chat-time">
                        {unreadCounts[group.id] && unreadCounts[group.id].count > 0 ? (
                          <span className="online-indicator unread"></span>
                        ) : (
                          group.role
                        )}
                      </span>
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
