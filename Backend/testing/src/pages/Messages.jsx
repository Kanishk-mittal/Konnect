import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import './Messages.css';
import { AppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import JSEncrypt from 'jsencrypt';
import CryptoJS from 'crypto-js';
import { io } from 'socket.io-client';

const Messages = () => {
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // State variables for messaging UI
    const [selectedChat, setSelectedChat] = useState(null);
    const [messageText, setMessageText] = useState('');
    const [messages, setMessages] = useState([]);
    const [chatType, setChatType] = useState(null); // 'user' or 'group'
    
    // State for current user information
    const [currentUser, setCurrentUser] = useState(null);
    
    // State for notifications
    const [notifications, setNotifications] = useState([]);
    
    // Add a loading state for messages
    const [messagesLoading, setMessagesLoading] = useState(false);
    
    // Get context values
    const { privateKey, dbKey, serverKey } = useContext(AppContext);
    const navigate = useNavigate();

    // Create axios instance with credentials
    const instance = axios.create({
        withCredentials: true,
        baseURL: "http://localhost:5000",
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        }
    });

    // Socket reference to maintain connection
    const socketRef = useRef(null);
    // Database reference
    const dbRef = useRef(null);

    // Initialize IndexedDB
    const initializeDB = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('messagesDB', 1);
            
            request.onerror = (event) => {
                reject('Error opening database');
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                // Create an object store for messages if it doesn't exist
                if (!db.objectStoreNames.contains('messages')) {
                    const store = db.createObjectStore('messages', { keyPath: 'id' });
                    // Create indexes for searching messages
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

    // Fetch messages from IndexedDB for a specific chat - enhanced version
    const fetchMessagesFromDB = (chatId, type) => {
        if (!dbRef.current) {
            console.error('Database not initialized');
            return;
        }
        
        setMessagesLoading(true);
        
        const transaction = dbRef.current.transaction(['messages'], 'readonly');
        const store = transaction.objectStore('messages');
        
        if (type === 'user') {
            // For user chats, we need to check both sender and receiver
            const allMessages = [];
            
            // First get messages where the user is sender
            const senderIndex = store.index('sender');
            const senderRequest = senderIndex.getAll(currentUser.logged_in_as);
            
            senderRequest.onsuccess = () => {
                allMessages.push(...senderRequest.result);
                
                // Then get messages where the user is receiver
                const receiverIndex = store.index('receiver');
                const receiverRequest = receiverIndex.getAll(currentUser.logged_in_as);
                
                receiverRequest.onsuccess = () => {
                    allMessages.push(...receiverRequest.result);
                    
                    // Filter to get only messages between current user and selected chat
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
                                text: decryptWithAES(msg.text, dbKey)
                            };
                        } catch (error) {
                            console.error('Error decrypting message:', error);
                            return {
                                ...msg,
                                text: "Error: Message could not be decrypted"
                            };
                        }
                    });
                    
                    setMessages(decryptedMessages);
                    setMessagesLoading(false);
                };
                
                receiverRequest.onerror = (event) => {
                    console.error('Error fetching messages:', event.target.error);
                    setMessagesLoading(false);
                };
            };
            
            senderRequest.onerror = (event) => {
                console.error('Error fetching messages:', event.target.error);
                setMessagesLoading(false);
            };
        } else {
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
                            text: decryptWithAES(msg.text, dbKey)
                        };
                    } catch (error) {
                        console.error('Error decrypting message:', error);
                        return {
                            ...msg,
                            text: "Error: Message could not be decrypted"
                        };
                    }
                });
                
                setMessages(decryptedMessages);
                setMessagesLoading(false);
            };
            
            request.onerror = (event) => {
                console.error('Error fetching group messages:', event.target.error);
                setMessagesLoading(false);
            };
        }
        
        // Handle transaction errors
        transaction.onerror = (event) => {
            console.error('Transaction error while fetching messages:', event.target.error);
            setMessagesLoading(false);
        };
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

    // Fetch current user info on component mount
    const fetchCurrentUserInfo = async () => {
        try {
            // Extract CSRF token from cookies
            const csrfToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('csrf_access_token='))
                ?.split('=')[1];

            if (!csrfToken) {
                setError("Authentication token not found. Please log in again.");
                return;
            }

            const response = await instance.post('/protected', {}, {
                headers: { "X-CSRF-TOKEN": csrfToken }
            });
            
            setCurrentUser(response.data);
        } catch (err) {
            setError("Failed to authenticate. Please log in again.");
            navigate('/login');
        }
    };

    // Fetch data when component mounts
    useEffect(() => {
        // Check if user is authenticated
        if (!privateKey || !dbKey) {
            navigate('/login');
            return;
        }

        // Initialize IndexedDB
        initializeDB().catch(error => {
            console.error('Error initializing database:', error);
        });

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch current user info first
                await fetchCurrentUserInfo();
                
                // Then fetch other data in parallel, including messages
                // This call to get_messages will also set the user as online
                await Promise.all([
                    fetchUsers(), 
                    fetchGroups(),
                    fetchStoredMessages()
                ]);
                setError(null);
            } catch (err) {
                // Error already handled in individual fetch functions
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, [privateKey, dbKey, navigate]);

    // Add a function to fetch messages from the server
    const fetchStoredMessages = async () => {
        try {
            const response = await instance.get('/get_messages');
            // Process and store received messages in IndexedDB
            if (response.data.messages && response.data.messages.length > 0) {
                console.log(`Retrieved ${response.data.messages.length} stored messages`);
                // Process each message as needed
                // This will also mark the user as online on the server
            }
        } catch (err) {
            console.error('Failed to fetch stored messages:', err);
        }
    };

    // Handle selecting a chat (user or group)
    const handleSelectChat = (id, type) => {
        setSelectedChat(id);
        setChatType(type);
        setMessages([]);
        setMessagesLoading(true);
        
        // Clear notifications for this chat
        setNotifications(prev => prev.filter(n => !(n.id === id && n.type === type)));
        
        // Load messages from IndexedDB
        fetchMessagesFromDB(id, type);
    };

    const generateAESKey = () => {
            // Generate a random 16-byte (128-bit) key
            const randomBytes = CryptoJS.lib.WordArray.random(16);
            return CryptoJS.enc.Base64.stringify(randomBytes);
        };

    // Handle sending a message
    
    const createMessage = (receiver, message,publicKey,group = null) => {
        // Create a unique message ID using CryptoJS
        const messageId = CryptoJS.SHA256(
            currentUser.logged_in_as +
            receiver +
            message +
            new Date().getTime().toString()
        ).toString();
        const aesKey = generateAESKey();
        const newMessage = {
            id: messageId,
            sender: currentUser.logged_in_as,
            receiver: receiver,
            text: message,
            timestamp: new Date().toISOString(),
            group: group,
            key: aesKey,
            receiverPublicKey: publicKey,
        };
        return newMessage;
    }

    const getUserKey = async (userId) => { 
        // getting the csrf token from the cookie
        const csrfToken = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrf_access_token='))
            ?.split('=')[1];
        if (!csrfToken) {
            return;
        }
        // Send request with CSRF token
        const response = await instance.post('/get_user_key', {
            roll: userId
        }, {
            withCredentials: true,
            headers: {
                "X-CSRF-TOKEN": csrfToken  // Include CSRF token in the request
            }
        });
        const userKey = response.data.key;
        return userKey;
    }

    const getGroupKeys = async (groupId) => {
        const csrfToken = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrf_access_token='))
            ?.split('=')[1];
        if (!csrfToken) {
            return;
        }
        // Send request with CSRF token
        const response = await instance.post('/get_group_keys', {
            group_id: selectedChat
        }, {
            withCredentials: true,
            headers: {
                "X-CSRF-TOKEN": csrfToken  // Include CSRF token in the request
            }
        });
        return response.data.keys;
    }

    const encryptWithAES = (message, key) => {
        // Decode base64 AES key
        const keyBytes = CryptoJS.enc.Base64.parse(key);

        // Generate a random IV (Initialization Vector)
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

    const createPacket = (message) => {
        // Encrypt the message using AES
        const aesKey = message.key;
        const publicKey = message.receiverPublicKey;
        const encryptedMessage = encryptWithAES(message.text, aesKey);
        // Encrypt the AES key using RSA
        const rsaEncoder = new JSEncrypt();
        rsaEncoder.setPublicKey(publicKey);
        const encryptedKey = rsaEncoder.encrypt(aesKey);
        // encrypting sender,group (if it exist) and receiver with server aes key
        const encryptedSender = encryptWithAES(message.sender, serverKey);
        const encryptedReceiver = encryptWithAES(message.receiver, serverKey);
        if (!(message.group === null)) {
            message.group= encryptWithAES(message.group, serverKey);
        }
        // Creating the packet
        const packet = {
            message: encryptedMessage,
            key: encryptedKey,
            sender: encryptedSender,
            receiver: encryptedReceiver,
            group: message.group,
            timestamp: message.timestamp
        };
        return packet;
    }

    // Remove socket initialization from sendMessage function
    const sendMessage = (message) => {
        const packet = createPacket(message);
        // Using the persistent socket connection established in useEffect
        if (socketRef.current) {
            socketRef.current.emit('send_message', packet);
        } else {
            // Try to re-establish connection if missing
            setupSocketConnection();
        }
    }

    // Create a separate function to set up socket connection
    const setupSocketConnection = () => {
        if (!currentUser) return false;
        
        // Close existing connection if it exists
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
        
        try {
            socketRef.current = io('http://localhost:5000', {
                withCredentials: true,
            });
            
            // Join room with user's roll number to receive messages
            socketRef.current.emit('join', { room: currentUser.logged_in_as });
            
            // Listen for incoming messages
            socketRef.current.on('receive_message', handleReceivedMessage);
            
            // Listen for message delivery confirmation
            socketRef.current.on('message_sent', (data) => {
                // Message delivery confirmed
            });
            
            socketRef.current.on('message_error', (error) => {
                // Message delivery error
            });
            
            socketRef.current.on('connect', () => {
                // Socket connected
            });
            
            socketRef.current.on('connect_error', (error) => {
                // Socket connection error
            });
            
            return true;
        } catch (error) {
            return false;
        }
    };

    const handleSendMessage = async(e) => {
        e.preventDefault();
        if (!messageText.trim() || !selectedChat || !currentUser) return;
        // identifying the type of chat
        var messageArray= [];
        if (chatType=='user') {
            // creting message object and displaying to console
            const PublicKey = await getUserKey(selectedChat);
            const messageObject = createMessage(selectedChat, messageText,PublicKey);
            messageArray.push(messageObject);
        }
        else {
            // creating message objct and displaying to console
            const keys = await getGroupKeys(selectedChat);
            for (let i = 0; i < keys.length; i++) {
                const publickey = keys[i].public_key;
                const receiver = keys[i].roll_number;
                
                // Skip creating a message if the receiver is the current user
                if (receiver === currentUser.logged_in_as) continue;
                
                const messageObject = createMessage(receiver, messageText, publickey, selectedChat);
                messageArray.push(messageObject);
            }
        }
        
        // Only proceed if there are messages to send
        if (messageArray.length > 0) {
            // Create a display message that we'll also save to IndexedDB
            const displayMessage = {
                id: messageArray[0].id,
                text: messageArray[0].text,
                sender: currentUser.logged_in_as,
                receiver: messageArray[0].receiver,
                timestamp: new Date().toISOString(),
                group: messageArray[0].group
            };
            
            // Save message to IndexedDB
            saveMessageToDB(displayMessage)
                .then(() => {
                    // Add message to UI
                    setMessages(prevMessages => [...prevMessages, displayMessage]);
                    
                    // Send the encrypted messages
                    for (let i = 0; i < messageArray.length; i++) {
                        sendMessage(messageArray[i]);
                    }
                })
                .catch(error => {
                    console.error('Error saving message:', error);
                });
        }
        
        // Clear the message input after sending
        setMessageText('');
    };

    // Function to decrypt AES encrypted message
    const decryptWithAES = (encryptedData, key) => {
        try {
            // Decode the base64 string to get encrypted data
            const ciphertext = CryptoJS.enc.Base64.parse(encryptedData);
            
            // Extract IV (first 16 bytes)
            const iv = CryptoJS.lib.WordArray.create(
                ciphertext.words.slice(0, 4),
                16
            );
            
            // Extract actual ciphertext (everything after IV)
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
    
    // Function to decrypt RSA encrypted AES key
    const decryptRSAKey = (encryptedKey) => {
        try {
            const decrypt = new JSEncrypt();
            decrypt.setPrivateKey(privateKey);
            const decryptedKey = decrypt.decrypt(encryptedKey);
            return decryptedKey;
        } catch (error) {
            return null;
        }
    };
    
    // Handle received messages from socket
    const handleReceivedMessage = (data) => {
        try {
            // Decrypt sender
            const sender = decryptWithAES(data.sender, serverKey);
            
            // Decrypt receiver (should be current user)
            const receiver = decryptWithAES(data.receiver, serverKey);
            
            // Check if this is a group message
            let group = null;
            if (data.group) {
                group = decryptWithAES(data.group, serverKey);
            }
            
            // Decrypt the AES key using user's private RSA key
            const decryptedAESKey = decryptRSAKey(data.key);
            if (!decryptedAESKey) {
                return;
            }
            
            // Decrypt the message using the decrypted AES key
            const decryptedMessage = decryptWithAES(data.message, decryptedAESKey);
            
            // Create a message object to save in DB and potentially display
            const newMessage = {
                id: CryptoJS.SHA256(sender + receiver + data.timestamp).toString(),
                text: decryptedMessage,
                sender: sender,
                receiver: receiver,
                timestamp: data.timestamp,
                group: group
            };
            
            // Save the message to IndexedDB
            saveMessageToDB(newMessage)
                .then(() => {
                    // Check if this chat is currently active
                    const isActiveChat = (chatType === 'user' && selectedChat === sender) || 
                                         (chatType === 'group' && selectedChat === group);
                    
                    if (isActiveChat) {
                        // Add message to current chat view
                        setMessages(prevMessages => [...prevMessages, newMessage]);
                    } else {
                        // Add notification for this chat
                        setNotifications(prev => {
                            // Check if notification already exists for this chat
                            const existingIndex = prev.findIndex(n => 
                                (n.type === 'user' && n.id === sender) || 
                                (n.type === 'group' && n.id === group)
                            );
                            
                            if (existingIndex >= 0) {
                                // Update existing notification
                                const updated = [...prev];
                                updated[existingIndex].count += 1;
                                updated[existingIndex].lastMessage = newMessage.text;
                                updated[existingIndex].timestamp = newMessage.timestamp;
                                return updated;
                            } else {
                                // Create new notification
                                return [...prev, {
                                    id: group || sender,
                                    type: group ? 'group' : 'user',
                                    count: 1,
                                    lastMessage: newMessage.text,
                                    timestamp: newMessage.timestamp,
                                    name: group 
                                        ? groups.find(g => g.id === group)?.name 
                                        : users.find(u => u.roll_number === sender)?.name || sender
                                }];
                            }
                        });
                    }
                })
                .catch(error => {
                    console.error('Error saving message to IndexedDB:', error);
                });
        } catch (error) {
            console.error('Error processing received message:', error);
        }
    };

    // Setup socket connection and listeners
    useEffect(() => {
        if (!currentUser) return;
        
        // Create socket connection if not already created
        if (!socketRef.current) {
            socketRef.current = io('http://localhost:5000', {
                withCredentials: true,
            });
            
            // Join room with user's roll number to receive messages
            socketRef.current.emit('join', { room: currentUser.logged_in_as });
            
            // Listen for incoming messages
            socketRef.current.on('receive_message', handleReceivedMessage);
            
            // Additional socket event handlers could be added here
            socketRef.current.on('connect', () => {
                // Socket connected
            });
            
            socketRef.current.on('connect_error', (error) => {
                // Socket connection error
            });
        }
        
        // Cleanup on component unmount
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [currentUser]);

    // Setup socket as soon as user info is available, separate from other data loading
    useEffect(() => {
        if (currentUser && currentUser.logged_in_as) {
            setupSocketConnection();
        }
        
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [currentUser]); // Only depend on currentUser, not all the other states
    
    // Set user as offline when component unmounts
    useEffect(() => {
        return () => {
            if (currentUser) {
                // Get the CSRF token
                const csrfToken = document.cookie
                    .split('; ')
                    .find(row => row.startsWith('csrf_access_token='))
                    ?.split('=')[1];
                
                if (csrfToken) {
                    // Send a request to set the user as offline
                    instance.post('/set_offline', {}, {
                        headers: { "X-CSRF-TOKEN": csrfToken }
                    })
                    .then(() => console.log('User set to offline'))
                    .catch(err => console.error('Error setting user offline:', err));
                }
            }
        };
    }, [currentUser]);

    return (
        <div className="messages-container">
            {/* Display context values for debugging */}
            <div className="debug-info" style={{ 
                position: 'fixed', 
                top: 0, 
                right: 0, 
                background: '#f0f0f0', 
                padding: '10px', 
                fontSize: '12px',
                borderRadius: '0 0 0 8px',
                boxShadow: '0 0 5px rgba(0,0,0,0.2)',
                zIndex: 1000
            }}>
                <p><strong>User:</strong> {currentUser?.logged_in_as || 'Unknown'}</p>
                <p><strong>Authentication:</strong> {dbKey ? 'Authenticated' : 'Not authenticated'}</p>
            </div>

            <div className="chat-sidebar">
                <h2>Messages</h2>
                
                {loading && <p>Loading data...</p>}
                
                {error && <div className="error-message">{error}</div>}
                
                {!loading && !error && (
                    <>
                        {/* Notifications Panel */}
                        {notifications.length > 0 && (
                            <div className="notifications-panel">
                                <h3>New Messages ({notifications.length})</h3>
                                <ul>
                                    {notifications.map(notif => (
                                        <li 
                                            key={`${notif.type}-${notif.id}`}
                                            className="notification-item"
                                            onClick={() => handleSelectChat(notif.id, notif.type)}
                                        >
                                            <div className="notification-info">
                                                <span className="notification-name">{notif.name || notif.id}</span>
                                                <span className="notification-badge">{notif.count}</span>
                                            </div>
                                            <div className="notification-preview">
                                                {notif.lastMessage.length > 25 
                                                    ? `${notif.lastMessage.substring(0, 25)}...` 
                                                    : notif.lastMessage}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        
                        <div className="chat-lists">
                            <div className="user-list">
                                <h3>Users ({users.length})</h3>
                                {users.length === 0 ? (
                                    <p>No users found</p>
                                ) : (
                                    <ul>
                                        {users.map(user => (
                                            <li 
                                                key={user.roll_number} 
                                                className={`chat-item ${selectedChat === user.roll_number && chatType === 'user' ? 'selected' : ''}`}
                                                onClick={() => handleSelectChat(user.roll_number, 'user')}
                                            >
                                                <div className="chat-info">
                                                    <span className="chat-name">{user.name}</span>
                                                    <span className={`status-indicator ${user.is_online ? 'online' : 'offline'}`}></span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            
                            <div className="group-list">
                                <h3>Groups ({groups.length})</h3>
                                {groups.length === 0 ? (
                                    <p>No groups found</p>
                                ) : (
                                    <ul>
                                        {groups.map(group => (
                                            <li 
                                                key={group.id} 
                                                className={`chat-item ${selectedChat === group.id && chatType === 'group' ? 'selected' : ''}`}
                                                onClick={() => handleSelectChat(group.id, 'group')}
                                            >
                                                <div className="chat-info">
                                                    <span className="chat-name">{group.name}</span>
                                                    <span className="chat-role">({group.role})</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="chat-main">
                {selectedChat ? (
                    <>
                        <div className="chat-header">
                            <div>
                                <h3>
                                    {chatType === 'user' 
                                        ? users.find(u => u.roll_number === selectedChat)?.name
                                        : groups.find(g => g.id === selectedChat)?.name
                                    }
                                </h3>
                                {/* Display roll number for direct messages */}
                                {chatType === 'user' && (
                                    <div className="user-roll">Roll: {selectedChat}</div>
                                )}
                            </div>
                            <span className="chat-type">
                                {chatType === 'user' ? 'Direct Message' : 'Group'}
                            </span>
                        </div>
                        
                        <div className="message-list">
                            {messagesLoading ? (
                                <div className="messages-loading">
                                    <p>Loading messages...</p>
                                </div>
                            ) : messages.length === 0 ? (
                                <p className="no-messages">No messages yet. Start a conversation!</p>
                            ) : (
                                messages.map(message => (
                                    <div 
                                        key={message.id} 
                                        className={`message ${message.sender === currentUser?.logged_in_as ? 'sent' : 'received'}`}
                                    >
                                        <div className="message-content">{message.text}</div>
                                        {message.groupInfo && (
                                            <div className="message-group-info">{message.groupInfo}</div>
                                        )}
                                        <div className="message-time">
                                            {new Date(message.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        
                        <form className="message-form" onSubmit={handleSendMessage}>
                            <input
                                type="text"
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                placeholder="Type a message..."
                                className="message-input"
                            />
                            <button type="submit" className="send-button">Send</button>
                        </form>
                    </>
                ) : (
                    <div className="no-chat-selected">
                        <p>Select a user or group to start messaging</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Messages;
