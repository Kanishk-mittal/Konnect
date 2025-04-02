import React, { useState, useContext, useEffect, useRef } from "react";
import { AppContext } from "../src/context/AppContext";
import axios from "axios";
import CryptoJS from "crypto-js"; // Add this import for decryption
import API_BASE_URL from "../Integration/apiConfig.js";
import { io } from "socket.io-client";
import { getAllUnreadCounts } from "./ChatUtils.jsx";
import "./Sidebar.css";
import JSEncrypt from "jsencrypt";

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
  const { privateKey, dbKey, serverKey, setServerKey, setPrivateKey, setDbKey } = useContext(AppContext);
  
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
  
  // Function to recover server key if it's missing
  const recoverServerKey = async () => {
    try {
      // Generate RSA key pair
      const crypt = new JSEncrypt({ default_key_size: 2048 });
      crypt.getKey();
      const publicKey = crypt.getPublicKey();
      const privateKey = crypt.getPrivateKey();
      
      // Extract CSRF token from cookies
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf_access_token='))
        ?.split('=')[1];
        
      if (!csrfToken) {
        throw new Error("Authentication token not found");
      }
      
      // Request server key using our public key
      const response = await instance.post('/server_key', 
        { publicKey },
        { headers: { "X-CSRF-TOKEN": csrfToken } }
      );
      
      // Decrypt the server key using our private key
      const decrypt = new JSEncrypt();
      decrypt.setPrivateKey(privateKey);
      const decryptedServerKey = decrypt.decrypt(response.data.key);
      
      if (!decryptedServerKey) {
        throw new Error("Failed to decrypt server key");
      }
      
      // Update the context with the recovered server key
      setServerKey(decryptedServerKey);
      console.log("Server key recovered successfully in Sidebar");
      
      return decryptedServerKey;
    } catch (err) {
      console.error("Failed to recover server key in Sidebar:", err);
      
      // More specific error messages based on the error type
      let errorMsg = "Authentication error: ";
      
      if (err.message.includes("token")) {
        errorMsg += "Session expired or authentication token missing. Please log in again.";
      } else if (err.response && err.response.status === 401) {
        errorMsg += "Unauthorized access. Please log in again.";
      } else if (err.message.includes("decrypt")) {
        errorMsg += "Failed to decrypt server key. Please log in again.";
      } else {
        errorMsg += (err.message || "Please try logging in again");
      }
      
      setError(errorMsg);
      return null;
    }
  };

  // Function to recover all encryption keys (server key, private key, DB key)
  const recoverAllKeys = async () => {
    try {
      // First, recover server key
      console.log("Attempting to recover all keys in Sidebar...");
      
      // Generate RSA key pair for server key recovery
      const crypt = new JSEncrypt({ default_key_size: 2048 });
      crypt.getKey();
      const publicKey = crypt.getPublicKey();
      const tempPrivateKey = crypt.getPrivateKey();
      
      // Extract CSRF token from cookies
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf_access_token='))
        ?.split('=')[1];
        
      if (!csrfToken) {
        throw new Error("Authentication token not found");
      }
      
      // 1. First get user info so we know the roll number
      const userResponse = await instance.post('/protected', {}, {
        headers: { "X-CSRF-TOKEN": csrfToken }
      });
      
      if (!userResponse.data || !userResponse.data.logged_in_as) {
        throw new Error("Failed to get user information");
      }
      
      const rollNumber = userResponse.data.logged_in_as;
      console.log(`Recovered user roll number: ${rollNumber}`);
      
      // 2. Request server key using our temporary public key
      const response = await instance.post('/server_key', 
        { publicKey },
        { headers: { "X-CSRF-TOKEN": csrfToken } }
      );
      
      // 3. Decrypt the server key using our temporary private key
      const decrypt = new JSEncrypt();
      decrypt.setPrivateKey(tempPrivateKey);
      const recoveredServerKey = decrypt.decrypt(response.data.key);
      
      if (!recoveredServerKey) {
        throw new Error("Failed to decrypt server key");
      }
      
      // Update context with server key
      setServerKey(recoveredServerKey);
      console.log("Server key recovered successfully in Sidebar");
      
      // 4. Now use server key to recover private key and DB key from localStorage
      const encryptedPrivateKey = localStorage.getItem(`encryptedPrivateKey_${rollNumber}`);
      const encryptedAESKey = localStorage.getItem(`encryptedAESKey_${rollNumber}`);
      
      if (!encryptedPrivateKey || !encryptedAESKey) {
        throw new Error("Stored encryption keys not found in localStorage");
      }
      
      // Import decryptWithAES function for local use
      const decryptWithAES = (encryptedData, key) => {
        if (!encryptedData) return null;
        try {
          // Convert the base64 encoded encrypted data to bytes
          const encryptedBytes = CryptoJS.enc.Base64.parse(encryptedData);
          
          // Split the encrypted data into the IV and the ciphertext
          const iv = encryptedBytes.clone();
          iv.sigBytes = 16; // AES block size is 16 bytes for IV
          iv.clamp();
          
          const ciphertext = encryptedBytes.clone();
          ciphertext.words.splice(0, 4); // Remove the first 4 words (16 bytes) which is the IV
          ciphertext.sigBytes -= 16;
          
          // Create decryption parameters
          const decryptParams = {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
          };
          
          // Decrypt the data
          const decryptedData = CryptoJS.AES.decrypt(
            { ciphertext: ciphertext },
            CryptoJS.enc.Utf8.parse(key),
            decryptParams
          );
          
          return decryptedData.toString(CryptoJS.enc.Utf8);
        } catch (error) {
          console.error("Decryption error:", error);
          return null;
        }
      };
      
      // Decrypt the private key using recovered server key
      const decryptedPrivateKey = decryptWithAES(encryptedPrivateKey, recoveredServerKey);
      if (!decryptedPrivateKey || !decryptedPrivateKey.includes("-----BEGIN RSA PRIVATE KEY-----")) {
        throw new Error("Failed to decrypt private key");
      }
      
      // Decrypt the AES/DB key using recovered server key
      const decryptedDBKey = decryptWithAES(encryptedAESKey, recoveredServerKey);
      if (!decryptedDBKey) {
        throw new Error("Failed to decrypt database key");
      }
      
      // Update context with all recovered keys
      setPrivateKey(decryptedPrivateKey);
      setDbKey(decryptedDBKey);
      
      console.log("All keys recovered successfully in Sidebar");
      
      return {
        serverKey: recoveredServerKey,
        privateKey: decryptedPrivateKey,
        dbKey: decryptedDBKey
      };
    } catch (err) {
      console.error("Failed to recover keys in Sidebar:", err);
      
      // More specific error messages based on the error type
      let errorMsg = "Key recovery failed: ";
      
      if (err.message.includes("token")) {
        errorMsg += "Session expired or authentication token missing. Please log in again.";
      } else if (err.response && err.response.status === 401) {
        errorMsg += "Unauthorized access. Please log in again.";
      } else if (err.message.includes("decrypt")) {
        errorMsg += "Failed to decrypt keys. Please log in again.";
      } else if (err.message.includes("localStorage")) {
        errorMsg += "Stored keys not found. Please log in again.";
      } else {
        errorMsg += (err.message || "Please try logging in again");
      }
      
      setError(errorMsg);
      return null;
    }
  };

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
      
      // Fetch current user then refresh counts instead of using undefined currentUser
      fetchCurrentUserInfo().then(userInfo => {
        if (userInfo) {
          setTimeout(() => fetchUnreadCounts(userInfo), 500);
        }
      });
    }
    
    // If parent component provided a selection handler, call it
    if (onSelectChat) {
      onSelectChat(id, type);
    }
  };
  
  // Fetch data when component mounts
  useEffect(() => {
    // Check if any key is missing
    const isMissingKeys = !privateKey || !dbKey || !serverKey;
    
    if (isMissingKeys) {
      setError("Attempting to recover keys...");
      setLoading(true);
    }

    const fetchData = async () => {
      try {
        // Check if any keys are missing
        if (isMissingKeys) {
          console.log("Some keys are missing in Sidebar, attempting full key recovery...");
          const recoveredKeys = await recoverAllKeys();
          if (!recoveredKeys) {
            throw new Error("Could not recover encryption keys");
          }
        }
        
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
        // More specific error message
        setError(err.message || "Error loading data. Please try again.");
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
  }, [privateKey, dbKey, serverKey]); // Added serverKey to dependencies
  
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
  
  // Set up listeners for message events
  useEffect(() => {
    const handleNewMessage = (event) => {
      const { chatId, type } = event.detail;
      
      console.log(`New message received for ${type}: ${chatId}`);
      
      // Update unread count - FIXED: using setUnreadCounts instead of setUnreadMessages
      setUnreadCounts(prev => ({
        ...prev,
        [chatId]: {
          count: ((prev[chatId] && prev[chatId].count) || 0) + 1,
          type: type
        }
      }));
    };
    
    const handleMessagesRead = (event) => {
      const { chatId } = event.detail;
      
      // Clear unread count for this chat - FIXED: using setUnreadCounts instead of setUnreadMessages
      setUnreadCounts(prev => ({
        ...prev,
        [chatId]: {
          count: 0,
          type: prev[chatId] ? prev[chatId].type : 'user'
        }
      }));
    };
    
    // Listen for new message notifications
    window.addEventListener('newMessage', handleNewMessage);
    // Listen for messages being read
    window.addEventListener('messagesRead', handleMessagesRead);
    
    return () => {
      window.removeEventListener('newMessage', handleNewMessage);
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
