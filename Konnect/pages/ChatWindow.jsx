import React, { useState, useEffect, useContext, useRef } from "react";
import MessageInput from "./MessageInput";
import { AppContext } from "../src/context/AppContext";
import axios from "axios";
import CryptoJS from "crypto-js";
import { io } from "socket.io-client";
import JSEncrypt from "jsencrypt";
import API_BASE_URL from "../Integration/apiConfig.js";
import "./ChatWindow.css";

const ChatWindow = ({ selectedChat, chatType }) => {
  // Access context for encryption keys
  const { privateKey, dbKey, serverKey } = useContext(AppContext);
  
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
  
  // Initialize IndexedDB
  const initializeDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('messagesDB', 1);
      
      request.onerror = (event) => {
        reject('Error opening database');
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('messages')) {
          const store = db.createObjectStore('messages', { keyPath: 'id' });
          store.createIndex('sender', 'sender', { unique: false });
          store.createIndex('receiver', 'receiver', { unique: false });
          store.createIndex('group', 'group', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
      
      request.onsuccess = (event) => {
        dbRef.current = event.target.result;
        resolve(event.target.result);
      };
    });
  };
  
  // Save message to IndexedDB
  const saveMessageToDB = (message) => {
    return new Promise((resolve, reject) => {
      if (!dbRef.current) {
        reject('Database not initialized');
        return;
      }
      
      // Encrypt the message text with dbKey before saving
      const encryptedText = encryptWithAES(message.text, dbKey);
      
      const messageToStore = {
        ...message,
        text: encryptedText // Store encrypted message text
      };
      
      const transaction = dbRef.current.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      
      const request = store.put(messageToStore);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject('Error saving message to database');
      };
    });
  };
  
  // Encrypt with AES
  const encryptWithAES = (message, key) => {
    // Decode base64 AES key
    const keyBytes = CryptoJS.enc.Base64.parse(key);

    // Generate a random IV
    const iv = CryptoJS.lib.WordArray.random(16);

    // Encrypt message using AES-CBC
    const encrypted = CryptoJS.AES.encrypt(message, keyBytes, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
      iv: iv
    });

    // Combine IV and ciphertext, then encode as base64
    return CryptoJS.enc.Base64.stringify(iv.concat(encrypted.ciphertext));
  };

  // Decrypt AES encrypted message
  const decryptWithAES = (encryptedData, key) => {
    try {
      // Decode the base64 string
      const ciphertext = CryptoJS.enc.Base64.parse(encryptedData);
      
      // Extract IV (first 16 bytes)
      const iv = CryptoJS.lib.WordArray.create(
        ciphertext.words.slice(0, 4),
        16
      );
      
      // Extract actual ciphertext
      const encryptedMessage = CryptoJS.lib.WordArray.create(
        ciphertext.words.slice(4),
        ciphertext.sigBytes - 16
      );
      
      // Decrypt using AES
      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: encryptedMessage },
        CryptoJS.enc.Base64.parse(key),
        { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
      );
      
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      return 'Error decrypting message';
    }
  };

  // Fetch messages from IndexedDB for a specific chat
  const fetchMessagesFromDB = (chatId, type) => {
    if (!dbRef.current || !currentUser) {
      return;
    }
    
    setIsLoading(true);
    
    const transaction = dbRef.current.transaction(['messages'], 'readonly');
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
            (msg.sender === chatId && msg.receiver === currentUser.logged_in_as) || 
            (msg.sender === currentUser.logged_in_as && msg.receiver === chatId)
          );
          
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
        // Sort by timestamp
        const sortedMessages = request.result.sort((a, b) => 
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
        return null;
      }

      const response = await instance.post('/protected', {}, {
        headers: { "X-CSRF-TOKEN": csrfToken }
      });
      
      setCurrentUser(response.data);
      return response.data;
    } catch (err) {
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

  // Generate AES key for secure messaging
  const generateAESKey = () => {
    // Generate a random 16-byte (128-bit) key
    const randomBytes = CryptoJS.lib.WordArray.random(16);
    return CryptoJS.enc.Base64.stringify(randomBytes);
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

  // Create message object
  const createMessage = (receiver, message, publicKey, group = null) => {
    // Create a unique message ID using CryptoJS
    const messageId = CryptoJS.SHA256(
      currentUser.logged_in_as +
      receiver +
      message +
      new Date().getTime().toString()
    ).toString();
    
    const aesKey = generateAESKey();
    
    return {
      id: messageId,
      sender: currentUser.logged_in_as,
      receiver: receiver,
      text: message,
      timestamp: new Date().toISOString(),
      group: group,
      key: aesKey,
      receiverPublicKey: publicKey,
    };
  };

  // Create encrypted packet for sending
  const createPacket = (message) => {
    // Encrypt the message using AES
    const aesKey = message.key;
    const publicKey = message.receiverPublicKey;
    const encryptedMessage = encryptWithAES(message.text, aesKey);
    
    // Encrypt the AES key using RSA
    const rsaEncoder = new JSEncrypt();
    rsaEncoder.setPublicKey(publicKey);
    const encryptedKey = rsaEncoder.encrypt(aesKey);
    
    // Encrypt sender, receiver and group with server AES key
    const encryptedSender = encryptWithAES(message.sender, serverKey);
    const encryptedReceiver = encryptWithAES(message.receiver, serverKey);
    let encryptedGroup = message.group;
    
    if (message.group) {
      encryptedGroup = encryptWithAES(message.group, serverKey);
    }
    
    // Create the packet
    return {
      message: encryptedMessage,
      key: encryptedKey,
      sender: encryptedSender,
      receiver: encryptedReceiver,
      group: encryptedGroup,
      timestamp: message.timestamp
    };
  };

  // Set up socket connection
  const setupSocketConnection = () => {
    if (!currentUser) return false;
    
    // Close existing connection
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    try {
      socketRef.current = io(API_BASE_URL, {
        withCredentials: true,
      });
      
      // Join room with user's roll number
      socketRef.current.emit('join', { room: currentUser.logged_in_as });
      
      // Listen for incoming messages
      socketRef.current.on('receive_message', handleReceivedMessage);
      
      // Listen for message delivery confirmation
      socketRef.current.on('message_sent', (data) => {
        // Message delivery confirmed
      });
      
      socketRef.current.on('message_error', (error) => {
        setError("Failed to send message");
      });
      
      return true;
    } catch (error) {
      setError("Failed to connect to messaging server");
      return false;
    }
  };

  // Send message via socket
  const sendMessage = (message) => {
    const packet = createPacket(message);
    
    if (socketRef.current) {
      socketRef.current.emit('send_message', packet);
    } else {
      setupSocketConnection();
      setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit('send_message', packet);
        }
      }, 500);
    }
  };

  // Decrypt RSA encrypted key
  const decryptRSAKey = (encryptedKey) => {
    try {
      const decrypt = new JSEncrypt();
      decrypt.setPrivateKey(privateKey);
      return decrypt.decrypt(encryptedKey);
    } catch (error) {
      return null;
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
      const decryptedAESKey = decryptRSAKey(data.key);
      if (!decryptedAESKey) {
        return;
      }
      
      // Decrypt the message
      const decryptedMessage = decryptWithAES(data.message, decryptedAESKey);
      
      // Create message object
      const newMessage = {
        id: CryptoJS.SHA256(sender + receiver + data.timestamp).toString(),
        text: decryptedMessage,
        sender: sender,
        receiver: receiver,
        timestamp: data.timestamp,
        group: group
      };
      
      // Save message to IndexedDB
      saveMessageToDB(newMessage)
        .then(() => {
          // Check if this message belongs to current chat
          const isActiveChat = (chatType === 'user' && 
                               ((selectedChat === sender && currentUser.logged_in_as === receiver) || 
                                (selectedChat === receiver && currentUser.logged_in_as === sender))) || 
                              (chatType === 'group' && selectedChat === group);
          
          if (isActiveChat) {
            // Update UI with new message
            setMessages(prevMessages => [
              ...prevMessages, 
              {
                ...newMessage,
                sender: sender === currentUser.logged_in_as ? "user" : "friend"
              }
            ]);
            
            // Scroll to bottom
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            }
          }
        })
        .catch(error => {
          setError("Failed to save received message");
        });
    } catch (error) {
      setError("Failed to process received message");
    }
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
    initializeDB()
      .then(() => fetchCurrentUserInfo())
      .then(user => {
        if (user) {
          // Fetch stored messages and set up socket
          fetchStoredMessages();
        }
      })
      .catch(err => {
        setError("Failed to initialize: " + err);
      });
      
    return () => {
      // Clean up socket connection on unmount
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      
      // Set user offline
      if (currentUser) {
        const csrfToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('csrf_access_token='))
          ?.split('=')[1];
          
        if (csrfToken) {
          instance.post('/set_offline', {}, {
            headers: { "X-CSRF-TOKEN": csrfToken }
          });
        }
      }
    };
  }, []);

  // Set up socket connection when user info is available
  useEffect(() => {
    if (currentUser && currentUser.logged_in_as) {
      setupSocketConnection();
    }
  }, [currentUser]);

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
        
        for (let i = 0; i < keys.length; i++) {
          const publicKey = keys[i].public_key;
          const receiver = keys[i].roll_number;
          
          // Skip creating a message for the current user
          if (receiver === currentUser.logged_in_as) continue;
          
          const messageObject = createMessage(receiver, text, publicKey, selectedChat);
          messageArray.push(messageObject);
        }
      }
      
      if (messageArray.length > 0) {
        // Create a display message that we'll save to IndexedDB
        const displayMessage = {
          id: messageArray[0].id,
          text: text,
          sender: currentUser.logged_in_as,
          receiver: messageArray[0].receiver,
          timestamp: new Date().toISOString(),
          group: chatType === 'group' ? selectedChat : null
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

  // Format timestamps for display
  const formatMessageTime = (timestamp) => {
    const messageDate = new Date(timestamp);
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for message grouping
  const formatMessageDate = (timestamp) => {
    const messageDate = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return "Today";
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups = {};
    
    messages.forEach(message => {
      const date = formatMessageDate(message.timestamp);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push({
        ...message,
        time: formatMessageTime(message.timestamp),
        date
      });
    });
    
    return groups;
  };

  // Get grouped messages
  const messageGroups = groupMessagesByDate();
  
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
