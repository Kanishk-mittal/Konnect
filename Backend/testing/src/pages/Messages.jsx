import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import CryptoJS from 'crypto-js';
import { io } from 'socket.io-client'; // Add socket.io-client import

const Messages = () => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();
    const { privateKey, dbKey } = useContext(AppContext);
    const messagesDb = useRef(null);
    const pollIntervalRef = useRef(null);
    const socketRef = useRef(null); // Add socket reference

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

    // Initialize WebSocket connection
    useEffect(() => {
        // Connect to the WebSocket server
        socketRef.current = io('http://localhost:5000', {
            withCredentials: true
        });

        // Set up event listeners
        socketRef.current.on('connect', () => {
            console.log('Connected to WebSocket server');
        });

        socketRef.current.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
        });

        socketRef.current.on('new_message', (data) => {
            console.log('Received new message:', data);
            handleNewMessage(data);
        });

        socketRef.current.on('message_stored', (data) => {
            console.log('Message stored in database:', data);
        });

        socketRef.current.on('message_error', (data) => {
            console.error('Message error:', data.error);
            setError(`Message error: ${data.error}`);
        });

        // Clean up on component unmount
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    // Handle incoming messages from socket
    const handleNewMessage = (data) => {
        try {
            // Decrypt the message
            const senderRoll = decrypt_AES_CBC(data.sender, dbKey);
            let decryptedContent = null;
            
            // Decrypt the message content using the AES key
            if (data.key) {
                decryptedContent = decryptWithAES(data.message, dbKey);
            } else {
                decryptedContent = decryptWithAES(data.message, dbKey);
            }
            
            if (!decryptedContent) {
                console.error('Failed to decrypt message content');
                return;
            }
            
            // Create message object
            const newMsg = {
                message_id: Date.now().toString(), // Generate a temporary ID
                sender: senderRoll,
                receiver: userInfo?.logged_in_as,
                message: decryptedContent,
                timestamp: new Date(data.timestamp)
            };
            
            // Add to messages state
            setMessages(prevMessages => [...prevMessages, newMsg]);
            
            // Store in IndexedDB
            if (messagesDb.current) {
                const transaction = messagesDb.current.transaction(['messages'], 'readwrite');
                const store = transaction.objectStore('messages');
                store.add({...newMsg, id: newMsg.message_id});
            }
            
            // Scroll to bottom
            scrollToBottom();
        } catch (error) {
            console.error('Error handling new message:', error);
        }
    };

    // Check authentication and setup message polling
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
                
                // Fetch messages and users
                fetchMessages(csrfToken);
                fetchUsers(csrfToken);
                
                // We don't need to poll as frequently with WebSockets
                pollIntervalRef.current = setInterval(() => {
                    fetchUsers(csrfToken); // Just update user statuses
                }, 10000); // Every 10 seconds
            } catch (error) {
                console.error("Error fetching user info:", error);
                setError("Could not authenticate. Please log in again.");
                setLoading(false);
            }
        };

        fetchUserInfo();

        // Clean up polling on unmount
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
            
            // Set user offline when leaving the page
            if (csrfToken && userInfo) {
                instance.post('/set_offline', {}, {
                    headers: { "X-CSRF-TOKEN": csrfToken }
                }).catch(err => {
                    console.error("Error setting user offline:", err);
                });
            }
        };
    }, [privateKey, dbKey, navigate]);

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
            if (loading) {
                setLoading(true);
            }
            
            const response = await instance.get('/get_messages', {
                headers: { "X-CSRF-TOKEN": csrfToken }
            });
            
            // Process and decrypt messages
            const decryptedMessages = await Promise.all(
                response.data.messages.map(msg => decryptAndStoreMessage(msg))
            );
            
            setMessages(prevMessages => {
                // Filter out null messages and duplicates
                const newMessages = decryptedMessages.filter(Boolean);
                const messageIds = new Set(prevMessages.map(msg => msg.message_id));
                const uniqueNewMessages = newMessages.filter(msg => !messageIds.has(msg.message_id));
                
                if (uniqueNewMessages.length === 0) {
                    return prevMessages;
                }
                
                return [...prevMessages, ...uniqueNewMessages];
            });
            
            setLoading(false);
        } catch (error) {
            console.error("Error fetching messages:", error);
            setError("Failed to load messages");
            setLoading(false);
        }
    };

    // Decrypt message and store in IndexedDB
    const decryptAndStoreMessage = async (message) => {
        if (!dbKey || !messagesDb.current) return null;
        
        try {
            // Skip if message already exists in state
            if (messages.some(msg => msg.message_id === message.message_id)) {
                return null;
            }
            
            // Decrypt the message content with AES key
            let decryptedContent;
            if (message.aes_key) {
                // If message has an AES key, decrypt the key first using private key
                // This would be for group messages or advanced encryption
                // Implementation depends on actual encryption scheme
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
            
            // Check if message already exists in store
            const request = store.get(decryptedMessage.id);
            request.onsuccess = (event) => {
                if (!event.target.result) {
                    // Message doesn't exist, add it
                    store.add(decryptedMessage);
                }
            };
            
            return decryptedMessage;
        } catch (error) {
            console.error("Error decrypting message:", error);
            return null;
        }
    };

    // Helper function to encrypt receiver roll number with AES
    const encrypt_AES_CBC = (text, key) => {
        if (!text || !key) return null;
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
                text,
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

    // Helper function to decrypt AES encrypted data
    const decrypt_AES_CBC = (encryptedData, key) => {
        if (!encryptedData || !key) return null;
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

    // Encrypt and send message using WebSocket
    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUser || !dbKey || !socketRef.current) return;
        
        try {
            // Encrypt message content with AES
            const encryptedContent = encryptWithAES(newMessage, dbKey);
            
            // Encrypt sender roll number (current user)
            const encryptedSender = encrypt_AES_CBC(userInfo.logged_in_as, dbKey);
            
            // Encrypt receiver roll number (selected user)
            const encryptedReceiver = encrypt_AES_CBC(selectedUser.roll_number, dbKey);
            
            // Send message via WebSocket
            socketRef.current.emit('send_message', {
                sender: encryptedSender,
                receiver: encryptedReceiver,
                message: encryptedContent,
                aes_key: dbKey,
                timestamp: new Date().toISOString(),
                group: null // This is a DM
            });
            
            // Add message to local state (optimistic UI update)
            const newMsg = {
                message_id: Date.now().toString(), // Generate a temporary ID
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
                store.add({...newMsg, id: newMsg.message_id});
            }
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message. Please try again.");
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
