import React, { useState, useEffect, useContext, useRef } from "react";
import MessageInput from "./MessageInput";
import { AppContext } from "../src/context/AppContext";
import axios from "axios";
import CryptoJS from "crypto-js";
import { io } from "socket.io-client";
import API_BASE_URL from "../Integration/apiConfig.js";
import "./ChatWindow.css";
import JSEncrypt from "jsencrypt";
// Import utility functions
import { 
  encryptWithAES, 
  decryptWithAES, 
  decryptRSAKey, 
  createMessage as createMessageUtil, 
  createPacket as createPacketUtil, 
  groupMessagesByDate 
} from "./ChatUtils";

const ChatWindow = ({ selectedChat, chatType }) => {
  // Access context for encryption keys
  const { privateKey, dbKey, serverKey, setServerKey, setPrivateKey, setDbKey } = useContext(AppContext);
  
  // State for messages and UI
  const [messages, setMessages] = useState([]);
  const [chatName, setChatName] = useState("Select a chat");
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  
  // Database reference
  const dbRef = useRef(null);
  // Socket reference
  const socketRef = useRef(null);
  // Messages container reference for scrolling
  const messagesContainerRef = useRef(null);
  
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

  // Function to recover all encryption keys
  const recoverAllKeys = async () => {
    try {
      // First, recover server key
      console.log("Attempting to recover all keys...");
      
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
        { headers: { "X-CSRF-TOKEN": csrfToken } }  // Added missing closing parenthesis here
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
      console.log("Server key recovered successfully");
      
      // 4. Now use server key to recover private key and DB key from localStorage
      const encryptedPrivateKey = localStorage.getItem(`encryptedPrivateKey_${rollNumber}`);
      const encryptedAESKey = localStorage.getItem(`encryptedAESKey_${rollNumber}`);
      
      if (!encryptedPrivateKey || !encryptedAESKey) {
        throw new Error("Stored encryption keys not found in localStorage");
      }
      
      // Define a local decryptWithAES function to ensure consistent decryption
      const localDecryptWithAES = (encryptedData, key) => {
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
      
      // Decrypt keys using our local function to ensure consistent behavior
      // Decrypt the private key using recovered server key
      const decryptedPrivateKey = localDecryptWithAES(encryptedPrivateKey, recoveredServerKey);
      if (!decryptedPrivateKey || !decryptedPrivateKey.includes("-----BEGIN RSA PRIVATE KEY-----")) {
        throw new Error("Failed to decrypt private key");
      }
      
      // Decrypt the AES/DB key using recovered server key
      const decryptedDBKey = localDecryptWithAES(encryptedAESKey, recoveredServerKey);
      if (!decryptedDBKey) {
        throw new Error("Failed to decrypt database key");
      }
      
      // Update context with all recovered keys
      setPrivateKey(decryptedPrivateKey);
      setDbKey(decryptedDBKey);
      
      console.log("All keys recovered successfully");
      
      return {
        serverKey: recoveredServerKey,
        privateKey: decryptedPrivateKey,
        dbKey: decryptedDBKey
      };
    } catch (err) {
      console.error("Failed to recover keys:", err);
      setError("Key recovery failed: " + (err.message || "Please try logging in again"));
      return null;
    }
  };

  // Initialize IndexedDB
  const initializeDB = () => {
    return new Promise((resolve, reject) => {
      if (!currentUser || !currentUser.logged_in_as) {
        reject(new Error('User information not available'));
        return;
      }
      
      // Include roll number in database name for user-specific storage
      const dbName = `messagesDB_${currentUser.logged_in_as}`;
      const request = indexedDB.open(dbName, 1);
      
      request.onerror = (event) => {
        reject(new Error(`Error opening database: ${event.target.error}`));
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('messages')) {
          const store = db.createObjectStore('messages', { keyPath: 'id' });
          store.createIndex('sender', 'sender', { unique: false });
          store.createIndex('receiver', 'receiver', { unique: false });
          store.createIndex('group', 'group', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('is_seen', 'is_seen', { unique: false }); // Add index for is_seen
        }
      };
      
      request.onsuccess = (event) => {
        dbRef.current = event.target.result;
        console.log(`Opened user-specific database: ${dbName}`);
        resolve(event.target.result);
      };
    });
  };
  
  // Save message to IndexedDB
  const saveMessageToDB = (message) => {
    return new Promise((resolve, reject) => {
      if (!dbRef.current) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      // Encrypt the message text with dbKey before saving
      const encryptedText = encryptWithAES(message.text, dbKey);
      
      const messageToStore = {
        ...message,
        text: encryptedText, // Store encrypted message text
        is_seen: message.is_seen !== undefined ? message.is_seen : false // Ensure is_seen property exists
      };
      
      const transaction = dbRef.current.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      
      const request = store.put(messageToStore);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        reject(new Error(`Error saving message to database: ${event.target.error}`));
      };
    });
  };

  // Fetch messages from IndexedDB for a specific chat
  const fetchMessagesFromDB = (chatId, type) => {
    if (!dbRef.current || !currentUser) {
      return;
    }
    
    setIsLoading(true);
    
    const transaction = dbRef.current.transaction(['messages'], 'readwrite'); // Changed to readwrite to update is_seen
    const store = transaction.objectStore('messages');
    
    if (type === 'user') {
      // For user chats, fetch both sent and received messages
      const allMessages = [];
      
      // Get messages where the user is sender
      const senderIndex = store.index('sender');
      const senderRequest = senderIndex.getAll(currentUser.logged_in_as);
      
      senderRequest.onsuccess = () => {
        allMessages.push(...senderRequest.result);
        
        // Get messages where the user is receiver
        const receiverIndex = store.index('receiver');
        const receiverRequest = receiverIndex.getAll(currentUser.logged_in_as);
        
        receiverRequest.onsuccess = () => {
          allMessages.push(...receiverRequest.result);
          
          // Filter relevant messages between current user and selected chat
          const relevantMessages = allMessages.filter(msg => 
            ((msg.sender === chatId && msg.receiver === currentUser.logged_in_as) || 
            (msg.sender === currentUser.logged_in_as && msg.receiver === chatId)) &&
            msg.group === null // Exclude group messages from DM conversations
          );
          
          // Mark all received messages as seen since user is viewing the chat
          let hasUnreadMessages = false;
          for (const msg of relevantMessages) {
            if (msg.receiver === currentUser.logged_in_as && !msg.is_seen) {
              // Mark message as seen
              msg.is_seen = true;
              hasUnreadMessages = true;
              // Update in database
              store.put(msg);
            }
          }
          
          // Notify other components (like sidebar) that messages were read
          if (hasUnreadMessages && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('messagesRead', {
              detail: { chatId, type }
            }));
            
            // Also dispatch a general update event for Header notifications
            window.dispatchEvent(new CustomEvent('messagesUpdate'));
          }
          
          // Sort by timestamp
          relevantMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          
          // Decrypt message text
          const decryptedMessages = relevantMessages.map(msg => {
            try {
              return {
                ...msg,
                text: decryptWithAES(msg.text, dbKey),
                sender: msg.sender === currentUser.logged_in_as ? "user" : "friend"
              };
            } catch (error) {
              return {
                ...msg,
                text: "Error: Message could not be decrypted",
                sender: msg.sender === currentUser.logged_in_as ? "user" : "friend"
              };
            }
          });
          
          setMessages(decryptedMessages);
          setIsLoading(false);
        };
      };
    } else if (type === 'group') {
      // For group chats, fetch by group ID
      const groupIndex = store.index('group');
      const request = groupIndex.getAll(chatId);
      
      request.onsuccess = () => {
        const messages = request.result;
        
        // Mark all received messages as seen since user is viewing the chat
        let hasUnreadMessages = false;
        for (const msg of messages) {
          if (msg.receiver === currentUser.logged_in_as && !msg.is_seen) {
            // Mark message as seen
            msg.is_seen = true;
            hasUnreadMessages = true;
            // Update in database
            store.put(msg);
          }
        }
        
        // Notify other components (like sidebar) that messages were read
        if (hasUnreadMessages && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('messagesRead', {
            detail: { chatId, type }
          }));
          
          // Also dispatch a general update event for Header notifications
          window.dispatchEvent(new CustomEvent('messagesUpdate'));
        }
        
        // Sort by timestamp
        const sortedMessages = messages.sort((a, b) => 
          new Date(a.timestamp) - new Date(b.timestamp)
        );
        
        // Decrypt message text
        const decryptedMessages = sortedMessages.map(msg => {
          try {
            return {
              ...msg,
              text: decryptWithAES(msg.text, dbKey),
              sender: msg.sender === currentUser.logged_in_as ? "user" : "friend"
            };
          } catch (error) {
            return {
              ...msg,
              text: "Error: Message could not be decrypted",
              sender: msg.sender === currentUser.logged_in_as ? "user" : "friend"
            };
          }
        });
        
        setMessages(decryptedMessages);
        setIsLoading(false);
      };
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
        console.error("No CSRF token found in cookies");
        return null;
      }

      console.log("Making request to /protected endpoint");
      const response = await instance.post('/protected', {}, {
        headers: { "X-CSRF-TOKEN": csrfToken }
      });
      
      if (!response.data || !response.data.logged_in_as) {
        console.error("Invalid response from /protected endpoint:", response.data);
        return null;
      }
      
      console.log("User data received:", response.data.logged_in_as);
      return response.data;
    } catch (err) {
      console.error("Authentication error:", err);
      setError("Failed to authenticate. Please log in again.");
      return null;
    }
  };

  // Get chat name from users or groups array
  const getChatName = async (chatId, type) => {
    try {
      if (type === 'user') {
        const response = await instance.get('/get_users');
        const users = response.data.users;
        const user = users.find(u => u.roll_number === chatId);
        return user ? user.name : chatId;
      } else if (type === 'group') {
        const response = await instance.get('/get_user_groups');
        const groups = response.data.groups;
        const group = groups.find(g => g.id === chatId);
        return group ? group.name : chatId;
      }
      return chatId;
    } catch (err) {
      return chatId;
    }
  };

  // Get user public key
  const getUserKey = async (userId) => { 
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrf_access_token='))
      ?.split('=')[1];
    
    if (!csrfToken) {
      return null;
    }
    
    try {
      const response = await instance.post('/get_user_key', { 
        roll: userId
      }, {
        headers: { "X-CSRF-TOKEN": csrfToken }
      });
      
      return response.data.key;
    } catch (error) {
      setError("Failed to get user's public key");
      return null;
    }
  };

  // Get group member keys
  const getGroupKeys = async (groupId) => {
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrf_access_token='))
      ?.split('=')[1];
    
    if (!csrfToken) {
      return [];
    }
    
    try {
      const response = await instance.post('/get_group_keys', {
        group_id: groupId
      }, {
        headers: { "X-CSRF-TOKEN": csrfToken }
      });
      
      return response.data.keys || [];
    } catch (error) {
      setError("Failed to get group keys");
      return [];
    }
  };

  // Create message object - wrapper for the utility function
  const createMessage = (receiver, message, publicKey, group = null) => {
    return createMessageUtil(currentUser, receiver, message, publicKey, group);
  };

  // Create encrypted packet for sending - wrapper for the utility function
  const createPacket = (message) => {
    return createPacketUtil(message, serverKey);
  };

  // Set up socket connection
  const setupSocketConnection = () => {
    if (!currentUser) return false;

    // Close existing connection
    if (socketRef.current) {
        socketRef.current.disconnect();
    }

    try {
        // Create socket with minimal options (matching the working Messages.jsx)
        socketRef.current = io('http://localhost:5000', {
            withCredentials: true
        });
        
        // Join room IMMEDIATELY after creating the socket (don't wait for connect event)
        socketRef.current.emit('join', { room: currentUser.logged_in_as });
        
        // Set up event handlers
        socketRef.current.on('receive_message', handleReceivedMessage);
        socketRef.current.on('message_sent', data => console.log("Message delivered:", data));
        socketRef.current.on('message_error', error => setError("Failed to send message"));
        socketRef.current.on('connect', () => console.log("Socket connected successfully"));
        socketRef.current.on('connect_error', error => console.error("Socket connection error:", error));
        socketRef.current.on('disconnect', reason => console.log("Socket disconnected:", reason));
        
        return true;
    } catch (error) {
        console.error("Socket connection error:", error);
        setError("Failed to connect to messaging server");
        return false;
    }
  };

  // Send message via socket
  const sendMessage = (message) => {
    const packet = createPacket(message);
    
    if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('send_message', packet);
    } else {
        setupSocketConnection();
        setTimeout(() => {
            if (socketRef.current && socketRef.current.connected) {
                socketRef.current.emit('send_message', packet);
            } else {
                setError("Could not connect to messaging server");
            }
        }, 500);
    }
  };

  // Handle received messages from socket
  const handleReceivedMessage = (data) => {
    try {
        // Decrypt sender
        const sender = decryptWithAES(data.sender, serverKey);
        
        // Decrypt receiver
        const receiver = decryptWithAES(data.receiver, serverKey);
        
        // Check if group message
        let group = null;
        if (data.group) {
            group = decryptWithAES(data.group, serverKey);
        }
        
        // Decrypt the AES key using private RSA key
        const decryptedAESKey = decryptRSAKey(data.key, privateKey);
        if (!decryptedAESKey) {
            return;
        }
        
        // Decrypt the message
        const decryptedMessage = decryptWithAES(data.message, decryptedAESKey);
        
        // Check if this message belongs to the currently active chat
        let belongsToCurrentChat = false;
        if (chatType === 'user') {
            // For direct messages:
            const isFromSelectedChatToMe = selectedChat === sender && currentUser.logged_in_as === receiver;
            const isNotGroupMessage = group === null;
            belongsToCurrentChat = isFromSelectedChatToMe && isNotGroupMessage;
        } else if (chatType === 'group') {
            // For group messages, just check if the group ID matches
            belongsToCurrentChat = selectedChat === group;
        }
        
        // Generate message ID - for group messages, use consistent ID based on group+sender+timestamp
        const messageId = group ? 
            CryptoJS.SHA256(sender + group + data.timestamp).toString() :
            CryptoJS.SHA256(sender + receiver + data.timestamp).toString();
        
        // Create message object
        const newMessage = {
            id: messageId,
            text: decryptedMessage,
            sender: sender,
            receiver: receiver,
            timestamp: data.timestamp,
            group: group,
            is_seen: sender === currentUser.logged_in_as || belongsToCurrentChat // Rule 1 or 2.1
        };
        
        // When message doesn't belong to current chat, trigger notification
        if (!belongsToCurrentChat && sender !== currentUser.logged_in_as) {
          // Dispatch notification event for new message
          window.dispatchEvent(new CustomEvent('newMessage', {
            detail: {
              sender: sender,
              chatId: group || sender,
              type: group ? 'group' : 'user',
              message: decryptedMessage.substring(0, 30) + (decryptedMessage.length > 30 ? '...' : '')
            }
          }));
          console.log(`Notification event dispatched for ${group ? 'group' : 'user'} message`);
        }
        
        // Check if this message already exists in database (for group messages)
        // to avoid duplicate messages
        if (group) {
            const transaction = dbRef.current.transaction(['messages'], 'readonly');
            const store = transaction.objectStore('messages');
            const request = store.get(messageId);
            
            request.onsuccess = (event) => {
                const existingMessage = event.target.result;
                if (existingMessage) {
                    // Message already exists, no need to save it again
                    return;
                }
                // Message doesn't exist, save it
                saveAndDisplayMessage(newMessage, belongsToCurrentChat);
            };
            
            request.onerror = () => {
                // On error, try to save anyway
                saveAndDisplayMessage(newMessage, belongsToCurrentChat);
            };
        } else {
            // For direct messages, just save and display
            saveAndDisplayMessage(newMessage, belongsToCurrentChat);
        }
    } catch (error) {
        console.error("Message processing error:", error);
        setError("Failed to process message: " + (error.message || error));
    }
  };

  // Helper function to save and display a message
  const saveAndDisplayMessage = (message, belongsToCurrentChat) => {
    saveMessageToDB(message)
        .then(() => {
            if (belongsToCurrentChat) {
                // Update UI with new message
                setMessages(prevMessages => [
                    ...prevMessages, 
                    {
                        ...message,
                        sender: message.sender === currentUser.logged_in_as ? "user" : "friend"
                    }
                ]);
                // Scroll to bottom
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                }
            }
        })
        .catch(error => {
            console.error("Database save error:", error);
            setError("Failed to save message: " + (error.message || error));
        });
  };

  // Fetch stored messages from server
  const fetchStoredMessages = async () => {
    try {
        const response = await instance.get('/get_messages');
        // This call also marks the user as online
        if (response.data.messages && response.data.messages.length > 0) {
            // Process each message as needed
        }
    } catch (err) {
        // Silently fail - we'll still have messages from IndexedDB
    }
  };

  // Initialize DB and fetch user info when component mounts
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log("Starting initialization...");
        
        // Check if any keys are missing
        if (!privateKey || !dbKey || !serverKey) {
          console.log("Some keys are missing, attempting full key recovery...");
          const recoveredKeys = await recoverAllKeys();
          if (!recoveredKeys) {
            throw new Error("Could not recover encryption keys");
          }
        }
        
        // Get user info first and make sure it's available before proceeding
        const user = await fetchCurrentUserInfo();
        console.log("User info received:", user ? "success" : "failed");
        
        if (!user || !user.logged_in_as) {
          throw new Error("User information not available, please log in again");
        }
        
        // Set current user in state and wait for it to be updated
        setCurrentUser(user);
        
        // Initialize DB with the user information we just fetched (don't use state yet)
        try {
          // Create a local initializeDB function that doesn't rely on currentUser state
          const initDB = () => {
            return new Promise((resolve, reject) => {
              if (!user || !user.logged_in_as) {
                reject(new Error('User information not available for DB initialization'));
                return;
              }
              
              // Include roll number in database name for user-specific storage
              const dbName = `messagesDB_${user.logged_in_as}`;
              console.log(`Initializing database: ${dbName}`);
              const request = indexedDB.open(dbName, 1);
              
              request.onerror = (event) => {
                console.error("DB open error:", event.target.error);
                reject(new Error(`Error opening database: ${event.target.error}`));
              };
              
              request.onupgradeneeded = (event) => {
                console.log("Creating DB schema...");
                const db = event.target.result;
                if (!db.objectStoreNames.contains('messages')) {
                  const store = db.createObjectStore('messages', { keyPath: 'id' });
                  store.createIndex('sender', 'sender', { unique: false });
                  store.createIndex('receiver', 'receiver', { unique: false });
                  store.createIndex('group', 'group', { unique: false });
                  store.createIndex('timestamp', 'timestamp', { unique: false });
                  store.createIndex('is_seen', 'is_seen', { unique: false });
                }
              };
              
              request.onsuccess = (event) => {
                dbRef.current = event.target.result;
                console.log(`Opened user-specific database: ${dbName}`);
                resolve(event.target.result);
              };
            });
          };
          
          await initDB();
          console.log("Database initialized successfully");
          
          // Fetch stored messages and set up socket
          await fetchStoredMessages();
          
        } catch (dbError) {
          console.error("Database initialization error:", dbError);
          throw dbError; // Re-throw to be caught by the outer catch
        }
      } catch (err) {
        console.error("Initialization error:", err);
        setError("Failed to initialize: " + (err.message || err.toString() || "Unknown error"));
      }
    };
    
    initializeApp();
    
    return () => {
      // Clean up socket connection on unmount
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      // Set user offline
      if (currentUser) {
        setUserOffline();
      }
    };
  }, [privateKey, dbKey, serverKey]); // Added all keys to dependency array

  // Set up socket connection when user info is available
  useEffect(() => {
    if (currentUser && currentUser.logged_in_as) {
        setupSocketConnection();  
    }
  }, [currentUser]);

  // Add an additional socket setup in useEffect to match Messages.jsx's redundancy
  useEffect(() => {
    if (currentUser && currentUser.logged_in_as) {
        // If socket doesn't exist, create one (similar to Messages.jsx)
        if (!socketRef.current) {
            socketRef.current = io('http://localhost:5000', { 
                withCredentials: true 
            });
            
            // Join room immediately
            socketRef.current.emit('join', { room: currentUser.logged_in_as });
            
            // Add event listeners
            socketRef.current.on('receive_message', handleReceivedMessage);
        }
    }
    
    // Set up event listeners for page unload
    const handleBeforeUnload = () => {
        setUserOffline();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleBeforeUnload);
    
    return () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
        // Clean up event listeners
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('unload', handleBeforeUnload);
        
        // Set user offline when component unmounts
        setUserOffline();
    };
  }, [currentUser]);
  
  // Function to set user offline - ensures this only happens once
const setUserOffline = () => {
  if (!currentUser) return;

  // Use a unique ID to deduplicate requests
  const requestId = `offline_${currentUser.logged_in_as}_${Date.now()}`;
  
  // Don't send if we've already sent a request in the last 3 seconds
  if (window.lastOfflineRequest && 
      Date.now() - window.lastOfflineRequest < 3000) {
    console.log("Skipping duplicate offline request");
    return;
  }
  
  window.lastOfflineRequest = Date.now();

  // Prepare data for the request
  const data = {
    roll_number: currentUser.logged_in_as,
    timestamp: new Date().toISOString(),
    request_id: requestId
  };

  try {
    // For normal navigation, fetch is more reliable than sendBeacon
    fetch(`${API_BASE_URL}/set_offline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    }).catch(err => console.error("Fetch error:", err));
    
    console.log("User set to offline");
  } catch (error) {
    console.error("Failed to set user offline:", error);
  }
};

  // Load messages when chat selection changes
  useEffect(() => {
    if (selectedChat && chatType && currentUser) {
      setIsLoading(true);
      // Fetch chat name
      getChatName(selectedChat, chatType).then(name => {
        setChatName(name);
        // Fetch messages for this chat
        fetchMessagesFromDB(selectedChat, chatType);
      });
    } else {
      setChatName("Select a chat");
      setMessages([]);
    }
  }, [selectedChat, chatType, currentUser]);

  // Handle sending a new message
  const handleSendMessage = async (text) => {
    if (!text.trim() || !selectedChat || !currentUser) return;
    
    try {
      let messageArray = [];
      // Generate a consistent message ID for display and database storage
      // This ensures we only have one entry per message, even for group chats
      const consistentMessageId = CryptoJS.SHA256(
        currentUser.logged_in_as +
        text +
        new Date().toISOString() +
        (chatType === 'group' ? selectedChat : '')
      ).toString();
       
      if (chatType === 'user') {
        // Direct message to user
        const publicKey = await getUserKey(selectedChat);
        if (!publicKey) {
          setError("Couldn't get recipient's public key");
          return;
        }
        
        const messageObject = createMessage(selectedChat, text, publicKey);
        messageArray.push(messageObject);
      } else {
        // Group message
        const keys = await getGroupKeys(selectedChat);
        if (!keys.length) {
          setError("Couldn't get group members' keys");
          return;
        }
        
        // Determine who gets the first message (for consistent ID reference)
        let firstRecipient = null;
        for (let i = 0; i < keys.length; i++) {
          const receiver = keys[i].roll_number;
          if (receiver !== currentUser.logged_in_as) {
            firstRecipient = receiver;
            break;
          }
        }
        
        // Create message objects for each recipient
        for (let i = 0; i < keys.length; i++) {
          const publicKey = keys[i].public_key;
          const receiver = keys[i].roll_number;
          
          // Skip creating a message for the current user
          if (receiver === currentUser.logged_in_as) continue;
          
          // Create message with unique transmission ID but preserve consistent database ID
          const messageObject = createMessage(receiver, text, publicKey, selectedChat, consistentMessageId);
          messageArray.push(messageObject);
        }
      }
      
      if (messageArray.length > 0) {
        // Create a display message that we'll save to IndexedDB
        const displayMessage = {
          // Use the consistent ID for database storage
          id: consistentMessageId,
          text: text,
          sender: currentUser.logged_in_as,
          receiver: messageArray[0].receiver,
          timestamp: new Date().toISOString(),
          group: chatType === 'group' ? selectedChat : null,
          is_seen: true // Rule 1: If we are sender then it's always true
        };
        // Save to IndexedDB
        await saveMessageToDB(displayMessage);
        
        // Update UI with the new message
        setMessages(prevMessages => [
          ...prevMessages, 
          {
            ...displayMessage,
            sender: "user"
          }
        ]);
        
        // Send encrypted messages
        for (let i = 0; i < messageArray.length; i++) {
          sendMessage(messageArray[i]);
        }
        
        // Scroll to bottom
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }
    } catch (error) {
      setError("Failed to send message: " + error.message);
    }
  };

  // Get grouped messages using the utility function
  const messageGroups = groupMessagesByDate(messages);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="chat-window">
      <div className="chat-header">
        <img src="../src/assets/profile.png" alt="profile" className="chat-avatar" />
        <div>
          <h3>{chatName}</h3>
          <p className="status">
            {selectedChat ? (chatType === 'user' ? 'Direct Message' : 'Group Chat') : 'No chat selected'}
          </p>
        </div>
      </div>
      {error ? (
        <div className="messages-container error">
          <p className="error-message">{error}</p>
        </div>
      ) : isLoading ? (
        <div className="messages-container loading">
          <p>Loading messages...</p>
        </div>
      ) : !selectedChat ? (
        <div className="messages-container empty-state">
          <p>Select a chat to start messaging</p>
        </div>
      ) : (
        <>
          <div className="messages-container" ref={messagesContainerRef}>
            {Object.keys(messageGroups).map(date => (
              <React.Fragment key={date}>
                <div className="date-label">{date}</div>
                {messageGroups[date].map((msg, index) => (
                  <div key={msg.id || index} className={`message-container ${msg.sender}`}>
                    <div className="message-bubble">
                      {msg.text}
                      <span className="message-time">{msg.time}</span>
                    </div>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
          <div className="Message-bar">
            <MessageInput onSend={handleSendMessage} />
          </div>
        </>
      )}
    </div>
  );
};

export default ChatWindow;
