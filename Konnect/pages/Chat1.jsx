import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../src/context/AppContext';
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";
import ChatWindow from "./ChatWindow.jsx";
import axios from "axios";
import API_BASE_URL from "../Integration/apiConfig.js";
import "./Chat1.css";

const Chat1 = () => {
  // State to track selected chat
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatType, setChatType] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Get context values if needed by component logic
  const { privateKey, dbKey, serverKey } = useContext(AppContext);
  
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

  // Set user as online when the chat page loads
  useEffect(() => {
    const fetchCurrentUserInfo = async () => {
      try {
        // Extract CSRF token from cookies
        const csrfToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('csrf_access_token='))
          ?.split('=')[1];

        if (!csrfToken) {
          return null;
        }

        // First get current user info
        const response = await instance.post('/protected', {}, {
          headers: { "X-CSRF-TOKEN": csrfToken }
        });
        
        setCurrentUser(response.data);
        
        // Then set as online
        await instance.post('/set_online', {}, {
          headers: { "X-CSRF-TOKEN": csrfToken }
        });
        
        console.log("User set to online");
        return response.data;
      } catch (err) {
        console.error("Failed to set user online:", err);
        return null;
      }
    };

    fetchCurrentUserInfo();
  }, []);

  // Add a cleanup function for component unmount
  useEffect(() => {
    return () => {
      // Set user as offline when navigating away from chat
      if (currentUser && currentUser.logged_in_as) {
        // Don't send if chatWindow has already sent a request in the last 3 seconds
        if (window.lastOfflineRequest && 
            Date.now() - window.lastOfflineRequest < 3000) {
          console.log("Skipping duplicate offline request in Chat1");
          return;
        }
        
        window.lastOfflineRequest = Date.now();
        
        // Simple POST request without JWT
        fetch(`${API_BASE_URL}/set_offline`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roll_number: currentUser.logged_in_as,
            timestamp: new Date().toISOString(),
            request_id: `chat1_${Date.now()}`
          })
        }).catch(err => console.error("Error setting user offline:", err));
      }
    };
  }, [currentUser]);

  // Handle chat selection from sidebar
  const handleSelectChat = (chatId, type) => {
    setSelectedChat(chatId);
    setChatType(type);
  };

  return (
    <div>
      <div className="header"><Header /></div>
      <div className="content">
        <div className="sidebar">
          <Sidebar onSelectChat={handleSelectChat} />
        </div>
        <div className="Window">
          <ChatWindow 
            selectedChat={selectedChat} 
            chatType={chatType} 
          />
        </div>
      </div>
    </div>
  );
};

export default Chat1;
