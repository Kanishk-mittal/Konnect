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

    // Function to fetch users from backend
    const fetchUsers = async () => {
        try {
            const response = await instance.get('/get_users');
            setUsers(response.data.users);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError('Failed to load users. Please try again later.');
        }
    };

    // Function to fetch user groups from backend
    const fetchGroups = async () => {
        try {
            const response = await instance.get('/get_user_groups');
            setGroups(response.data.groups);
        } catch (err) {
            console.error('Error fetching groups:', err);
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
            console.log("Current user info:", response.data);
        } catch (err) {
            console.error("Error fetching current user info:", err);
            setError("Failed to authenticate. Please log in again.");
            navigate('/login');
        }
    };

    // Fetch data when component mounts
    useEffect(() => {
        // Check if user is authenticated
        if (!privateKey || !dbKey) {
            console.log("User not authenticated, redirecting to login");
            navigate('/login');
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch current user info first
                await fetchCurrentUserInfo();
                
                // Then fetch other data in parallel
                await Promise.all([fetchUsers(), fetchGroups()]);
                setError(null);
            } catch (err) {
                console.error('Error loading data:', err);
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, [privateKey, dbKey, navigate]);

    // Handle selecting a chat (user or group)
    const handleSelectChat = (id, type) => {
        setSelectedChat(id);
        setChatType(type);
        setMessages([]);
        
        // For demo purposes, add some placeholder messages
        // TODO : Replace with actual message fetching logic which will be in index db
        const placeholderMessages = [
            {
                id: 1,
                text: `This is a placeholder message in ${type === 'user' ? 'direct message' : 'group'} chat`,
                sender: currentUser?.logged_in_as,
                timestamp: new Date().toISOString()
            },
            {
                id: 2,
                text: `Hello from ${id}!`,
                sender: id,
                timestamp: new Date().toISOString()
            }
        ];
        
        setMessages(placeholderMessages);
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
            console.error("CSRF token not found");
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
            console.error("CSRF token not found");
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
        console.log(message,key);

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
            console.error('Socket connection not established');
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
            console.log('Establishing socket connection');
            socketRef.current = io('http://localhost:5000', {
                withCredentials: true,
            });
            
            // Join room with user's roll number to receive messages
            socketRef.current.emit('join', { room: currentUser.logged_in_as });
            
            // Listen for incoming messages
            socketRef.current.on('receive_message', handleReceivedMessage);
            
            // Listen for message delivery confirmation
            socketRef.current.on('message_sent', (data) => {
                console.log('Message delivery confirmed:', data);
            });
            
            socketRef.current.on('message_error', (error) => {
                console.error('Message delivery error:', error);
            });
            
            socketRef.current.on('connect', () => {
                console.log('Socket connected');
            });
            
            socketRef.current.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
            });
            
            return true;
        } catch (error) {
            console.error('Failed to establish socket connection:', error);
            return false;
        }
    };

    const handleSendMessage = async(e) => {
        e.preventDefault();
        if (!messageText.trim() || !selectedChat || !currentUser) return;
        // identifying the type of chat
        var messageArray= [];
        if (chatType=='user') {
            console.log("Sending message to user: ", selectedChat);
            // creting message object and displaying to console
            const PublicKey = await getUserKey(selectedChat);
            const messageObject = createMessage(selectedChat, messageText,PublicKey);
            messageArray.push(messageObject);
        }
        else {
            console.log("Sending message to group: ", selectedChat);
            // creating message objct and displaying to console
            const keys = await getGroupKeys(selectedChat);
            for (let i = 0; i < keys.length; i++) {
                const publickey = keys[i].publicKey;
                const receiver = keys[i].roll_number;
                const messageObject = createMessage(receiver, messageText, publickey, selectedChat);
                messageArray.push(messageObject);
            }
        }
        // adding the first message to the messages array
        setMessages(prevMessages => [...prevMessages, messageArray[0]]);
        // sending message
        for (let i = 0; i < messageArray.length; i++) {
            const element = messageArray[i];
            sendMessage(element);
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
            console.error('Error decrypting message:', error);
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
            console.error('Error decrypting RSA key:', error);
            return null;
        }
    };
    
    // Handle received messages from socket
    const handleReceivedMessage = (data) => {
        console.log('Received message data:', data);
        
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
                console.error('Failed to decrypt message key');
                return;
            }
            
            // Decrypt the message using the decrypted AES key
            const decryptedMessage = decryptWithAES(data.message, decryptedAESKey);
            
            // Create a message object to add to state
            const newMessage = {
                id: CryptoJS.SHA256(sender + receiver + data.timestamp).toString(),
                text: decryptedMessage,
                sender: sender,
                receiver: receiver,
                timestamp: data.timestamp,
                group: group
            };
            
            console.log('Decrypted message:', newMessage);
            
            // Update message list in UI
            setMessages(prevMessages => [...prevMessages, newMessage]);
            
            // If this chat isn't currently selected, could add notification logic here
            if ((chatType === 'user' && selectedChat !== sender) || 
                (chatType === 'group' && selectedChat !== group)) {
                // Could implement notification logic
                console.log('Message received in background chat');
            }
        } catch (error) {
            console.error('Error processing received message:', error);
        }
    };

    // Setup socket connection and listeners
    useEffect(() => {
        if (!currentUser) return;
        
        // Create socket connection if not already created
        if (!socketRef.current) {
            console.log('Establishing socket connection');
            socketRef.current = io('http://localhost:5000', {
                withCredentials: true,
            });
            
            // Join room with user's roll number to receive messages
            socketRef.current.emit('join', { room: currentUser.logged_in_as });
            
            // Listen for incoming messages
            socketRef.current.on('receive_message', handleReceivedMessage);
            
            // Additional socket event handlers could be added here
            socketRef.current.on('connect', () => {
                console.log('Socket connected');
            });
            
            socketRef.current.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
            });
        }
        
        // Cleanup on component unmount
        return () => {
            if (socketRef.current) {
                console.log('Disconnecting socket');
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
                console.log('Disconnecting socket');
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [currentUser]); // Only depend on currentUser, not all the other states

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
                            {messages.length === 0 ? (
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
