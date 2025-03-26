import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import CryptoJS from 'crypto-js';
import io from 'socket.io-client';

const Messages = () => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);
    const navigate = useNavigate();
    const { privateKey, dbKey } = useContext(AppContext);
    const messagesDb = useRef(null);

    // Create axios instance with credentials
    const instance = axios.create({
        withCredentials: true,
        baseURL: "http://localhost:5000",
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    });

    // Initialize IndexedDB for message storage
    useEffect(() => {
        if (!dbKey) {
            console.error("DB Key not available. Cannot initialize message storage.");
            return;
        }

        const request = indexedDB.open("KonnectMessages", 1);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('messages')) {
                const store = db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
                store.createIndex('by_conversation', ['sender', 'receiver'], { unique: false });
                store.createIndex('by_timestamp', 'timestamp', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            messagesDb.current = event.target.result;
            console.log("IndexedDB initialized for messages");
        };

        request.onerror = (event) => {
            console.error("Error initializing IndexedDB:", event.target.error);
            setError("Failed to initialize message storage");
        };
    }, [dbKey]);

    // Check authentication and connect to socket
    useEffect(() => {
        if (!privateKey || !dbKey) {
            console.error("Authentication keys missing");
            navigate('/login');
            return;
        }

        // Get CSRF token
        const csrfToken = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrf_access_token='))
            ?.split('=')[1];

        if (!csrfToken) {
            console.error("CSRF token not found");
            setError("Authentication token not found. Please log in again.");
            return;
        }

        // Get current user info
        const fetchUserInfo = async () => {
            try {
                const response = await instance.post('/protected', {}, {
                    headers: { "X-CSRF-TOKEN": csrfToken }
                });
                setUserInfo(response.data);
                
                // Connect to socket with authentication
                console.log(`Attempting to connect to socket server at: http://localhost:5000`);
                socketRef.current = io('http://localhost:5000', {
                    withCredentials: true,
                    query: { token: csrfToken },
                    autoConnect: true,
                    reconnection: true,
                    reconnectionAttempts: 5,
                    reconnectionDelay: 1000
                });
                
                // Set up socket event listeners
                setupSocketListeners();
                
                // Fetch messages and users
                fetchMessages(csrfToken);
                fetchUsers(csrfToken);
            } catch (error) {
                console.error("Error fetching user info:", error);
                setError("Could not authenticate. Please log in again.");
                setLoading(false);
            }
        };

        fetchUserInfo();

        // Cleanup function to set user offline and disconnect socket
        return () => {
            if (csrfToken && userInfo) {
                instance.post('/set_offline', {}, {
                    headers: { "X-CSRF-TOKEN": csrfToken }
                }).catch(err => {
                    console.error("Error setting user offline:", err);
                });
            }
            
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [privateKey, dbKey, navigate]);

    // Setup socket event listeners
    const setupSocketListeners = () => {
        if (!socketRef.current) return;

        socketRef.current.on('connect', () => {
            const timestamp = new Date().toISOString();
            console.log(`%c[${timestamp}] SOCKET CONNECTED`, 'color: green; font-weight: bold');
            console.log(`Socket ID: ${socketRef.current.id}`);
            console.log(`Connected to: ${socketRef.current.io.uri}`);
            console.log(`User: ${userInfo?.logged_in_as}`);
        });

        socketRef.current.on('disconnect', (reason) => {
            const timestamp = new Date().toISOString();
            console.log(`%c[${timestamp}] SOCKET DISCONNECTED`, 'color: red; font-weight: bold');
            console.log(`Reason: ${reason}`);
            console.log(`Will reconnect automatically: ${socketRef.current.io.reconnection}`);
        });

        socketRef.current.on('connect_error', (error) => {
            console.error('Connection error:', error.message);
        });

        socketRef.current.on('message', (encryptedMessage) => {
            console.log("Received message:", encryptedMessage);
            
            // Check if message has recipient metadata (from broadcast)
            if (encryptedMessage._recipients) {
                // Only process if current user is in the recipients list
                if (!encryptedMessage._recipients.includes(userInfo?.logged_in_as)) {
                    console.log("Message not for this user, ignoring");
                    return;
                }
                // Remove metadata before processing
                delete encryptedMessage._recipients;
            }
            
            // Only process messages to/from the current user
            if (encryptedMessage.sender === userInfo?.logged_in_as || 
                encryptedMessage.receiver === userInfo?.logged_in_as) {
                handleIncomingMessage(encryptedMessage);
            } else {
                console.log("Message not relevant to current user, ignoring");
            }
        });

        socketRef.current.on('user_status', (data) => {
            console.log("User status update:", data);
            // Update user status in the users list
            setUsers(prevUsers => prevUsers.map(user => 
                user.roll_number === data.roll_number 
                    ? { ...user, is_online: data.status === 'online' } 
                    : user
            ));
        });
        
        // Add an error handler
        socketRef.current.on('error', (error) => {
            console.error("Socket error:", error);
            setError(`Socket error: ${error.message || 'Unknown error'}`);
        });
        
        // Add a reconnect handler
        socketRef.current.on('reconnect', (attempt) => {
            console.log(`Socket reconnected after ${attempt} attempts`);
            // Re-fetch messages and users upon reconnection
            const csrfToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('csrf_access_token='))
                ?.split('=')[1];
                
            if (csrfToken) {
                fetchMessages(csrfToken);
                fetchUsers(csrfToken);
            }
        });
    };

    // Fetch users list
    const fetchUsers = async (csrfToken) => {
        try {
            const response = await instance.get('/get_users', {
                headers: { "X-CSRF-TOKEN": csrfToken }
            });
            setUsers(response.data.users);
            console.log("Users list:", response.data.users);
        } catch (error) {
            console.error("Error fetching users:", error);
            setError("Failed to load users list");
        }
    };

    // Fetch messages
    const fetchMessages = async (csrfToken) => {
        try {
            setLoading(true);
            const response = await instance.get('/get_messages', {
                headers: { "X-CSRF-TOKEN": csrfToken }
            });
            
            // Process and decrypt messages
            const decryptedMessages = await Promise.all(
                response.data.messages.map(msg => decryptAndStoreMessage(msg))
            );
            
            setMessages(decryptedMessages.filter(Boolean));
            setLoading(false);
        } catch (error) {
            console.error("Error fetching messages:", error);
            setError("Failed to load messages");
            setLoading(false);
        }
    };

    // Handle incoming message from socket
    const handleIncomingMessage = async (encryptedMessage) => {
        try {
            console.log("Processing incoming message:", encryptedMessage);
            
            // Skip messages not relevant to the current user
            if (userInfo?.logged_in_as !== encryptedMessage.sender && 
                userInfo?.logged_in_as !== encryptedMessage.receiver) {
                console.log("Message not relevant to current user, skipping");
                return;
            }
            
            // If it's a message the user sent (from another device), skip if already in state
            if (encryptedMessage.sender === userInfo?.logged_in_as) {
                const isDuplicate = messages.some(msg => 
                    msg.message_id === encryptedMessage.message_id
                );
                
                if (isDuplicate) {
                    console.log("Duplicate message, skipping");
                    return;
                }
            }
            
            const decryptedMessage = await decryptAndStoreMessage(encryptedMessage);
            if (decryptedMessage) {
                setMessages(prevMessages => {
                    // Check if message already exists to avoid duplicates
                    const exists = prevMessages.some(msg => 
                        msg.message_id === decryptedMessage.message_id
                    );
                    
                    if (exists) {
                        console.log("Message already in state, not adding again");
                        return prevMessages;
                    }
                    
                    return [...prevMessages, decryptedMessage];
                });
                scrollToBottom();
            }
        } catch (error) {
            console.error("Error processing incoming message:", error);
        }
    };

    // Decrypt message and store in IndexedDB
    const decryptAndStoreMessage = async (message) => {
        if (!dbKey || !messagesDb.current) return null;
        
        try {
            // Decrypt the message content with AES key
            let decryptedContent;
            if (message.aes_key) {
                // If message has an AES key, decrypt the key first using private key
                // This would be for group messages or advanced encryption
                // Implementation depends on actual encryption scheme
                // For this example, we'll use a simplified approach
                decryptedContent = decryptWithAES(message.message, dbKey);
            } else {
                // Direct decrypt for simple messages
                decryptedContent = decryptWithAES(message.message, dbKey);
            }
            
            const decryptedMessage = {
                ...message,
                message: decryptedContent,
                timestamp: new Date(message.timestamp)
            };
            
            // Store in IndexedDB
            const transaction = messagesDb.current.transaction(['messages'], 'readwrite');
            const store = transaction.objectStore('messages');
            
            // Use message_id as the key if available
            if (message.message_id) {
                decryptedMessage.id = message.message_id;
            }
            
            store.add(decryptedMessage);
            
            return decryptedMessage;
        } catch (error) {
            console.error("Error decrypting message:", error);
            return null;
        }
    };

    // Encrypt and send message
    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUser || !dbKey) return;
        
        try {
            // Get user's public key for encryption
            const response = await instance.post('/get_user_key', 
                { roll: selectedUser.roll_number }, 
                {
                    headers: {
                        "X-CSRF-TOKEN": document.cookie
                            .split('; ')
                            .find(row => row.startsWith('csrf_access_token='))
                            ?.split('=')[1]
                    }
                }
            );
            
            const recipientPublicKey = response.data.key;
            
            // Encrypt message content with dbKey
            const encryptedContent = encryptWithAES(newMessage, dbKey);
            
            // Send message through socket
            socketRef.current.emit('send_message', {
                receiver: selectedUser.roll_number,
                message: encryptedContent
            });
            
            // Add message to local state (optimistic UI update)
            const newMsg = {
                sender: userInfo.logged_in_as,
                receiver: selectedUser.roll_number,
                message: newMessage,
                timestamp: new Date()
            };
            
            setMessages(prevMessages => [...prevMessages, newMsg]);
            setNewMessage('');
            scrollToBottom();
            
            // Store the sent message in IndexedDB
            if (messagesDb.current) {
                const transaction = messagesDb.current.transaction(['messages'], 'readwrite');
                const store = transaction.objectStore('messages');
                store.add(newMsg);
            }
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message. Please try again.");
        }
    };

    // Helper function to decrypt message with AES
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
            console.error('Decryption failed:', error);
            return null;
        }
    };

    // Helper function to encrypt message with AES
    const encryptWithAES = (data, key) => {
        if (!data) return null;
        try {
            // Generate a random IV
            const iv = CryptoJS.lib.WordArray.random(16); // 16 bytes for AES
            
            // Create encryption parameters
            const encryptParams = {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            };
            
            // Encrypt the data
            const encrypted = CryptoJS.AES.encrypt(
                data,
                CryptoJS.enc.Utf8.parse(key),
                encryptParams
            );
            
            // Combine IV and ciphertext and convert to base64
            const ivAndCiphertext = iv.concat(encrypted.ciphertext);
            return CryptoJS.enc.Base64.stringify(ivAndCiphertext);
        } catch (error) {
            console.error('Encryption failed:', error);
            return null;
        }
    };

    // Auto-scroll to bottom of messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Filter messages for selected user
    const filteredMessages = selectedUser ? 
        messages.filter(msg => 
            (msg.sender === userInfo?.logged_in_as && msg.receiver === selectedUser.roll_number) ||
            (msg.sender === selectedUser.roll_number && msg.receiver === userInfo?.logged_in_as)
        ) : [];

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <h1>Messages</h1>
            
            {error && (
                <div style={{ 
                    backgroundColor: '#f8d7da', 
                    color: '#721c24', 
                    padding: '10px', 
                    borderRadius: '4px',
                    marginBottom: '20px'
                }}>
                    {error}
                </div>
            )}
            
            <div style={{ display: 'flex', gap: '20px', height: '70vh' }}>
                {/* Users list */}
                <div style={{ 
                    width: '30%', 
                    borderRight: '1px solid #ddd',
                    overflowY: 'auto'
                }}>
                    <h3>Users</h3>
                    {loading ? (
                        <p>Loading users...</p>
                    ) : (
                        <div>
                            {users.filter(user => user.roll_number !== userInfo?.logged_in_as).map(user => (
                                <div 
                                    key={user.roll_number}
                                    onClick={() => setSelectedUser(user)}
                                    style={{
                                        padding: '10px',
                                        borderBottom: '1px solid #eee',
                                        backgroundColor: selectedUser?.roll_number === user.roll_number ? '#f0f0f0' : 'transparent',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <div>
                                        <strong>{user.name}</strong>
                                        <div>{user.roll_number}</div>
                                    </div>
                                    <div style={{ 
                                        width: '10px', 
                                        height: '10px', 
                                        borderRadius: '50%',
                                        backgroundColor: user.is_online ? '#28a745' : '#dc3545'
                                    }}/>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Chat area */}
                <div style={{ width: '70%', display: 'flex', flexDirection: 'column' }}>
                    {selectedUser ? (
                        <>
                            <div style={{ 
                                padding: '10px', 
                                borderBottom: '1px solid #ddd',
                                backgroundColor: '#f8f9fa'
                            }}>
                                <h3>
                                    {selectedUser.name} 
                                    <span style={{ 
                                        fontSize: '0.7em',
                                        marginLeft: '10px',
                                        color: selectedUser.is_online ? '#28a745' : '#dc3545'
                                    }}>
                                        {selectedUser.is_online ? '(Online)' : '(Offline)'}
                                    </span>
                                </h3>
                                <div>{selectedUser.roll_number}</div>
                            </div>
                            
                            <div style={{ 
                                flexGrow: 1, 
                                overflowY: 'auto',
                                padding: '10px',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                {loading ? (
                                    <p>Loading messages...</p>
                                ) : filteredMessages.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>
                                        No messages yet. Send a message to start the conversation.
                                    </p>
                                ) : (
                                    filteredMessages.map((msg, index) => (
                                        <div 
                                            key={index}
                                            style={{
                                                alignSelf: msg.sender === userInfo?.logged_in_as ? 'flex-end' : 'flex-start',
                                                backgroundColor: msg.sender === userInfo?.logged_in_as ? '#dcf8c6' : '#f2f2f2',
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                marginBottom: '8px',
                                                maxWidth: '70%'
                                            }}
                                        >
                                            <div>{msg.message}</div>
                                            <div style={{ 
                                                fontSize: '0.7em', 
                                                color: '#666',
                                                textAlign: 'right',
                                                marginTop: '4px'
                                            }}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                            
                            <form 
                                onSubmit={sendMessage}
                                style={{ 
                                    display: 'flex', 
                                    padding: '10px',
                                    borderTop: '1px solid #ddd'
                                }}
                            >
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    style={{
                                        flexGrow: 1,
                                        padding: '8px',
                                        borderRadius: '4px',
                                        border: '1px solid #ddd',
                                        marginRight: '10px'
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: '#646cff',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: newMessage.trim() ? 'pointer' : 'not-allowed'
                                    }}
                                >
                                    Send
                                </button>
                            </form>
                        </>
                    ) : (
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            height: '100%',
                            color: '#666'
                        }}>
                            <p>Select a user to start chatting</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Messages;
