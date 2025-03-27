import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import './Messages.css';
import { AppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import CryptoJS from 'crypto-js';
import JSEncrypt from 'jsencrypt';

const Messages = () => {
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // New state variables for messaging UI
    const [selectedChat, setSelectedChat] = useState(null);
    const [messageText, setMessageText] = useState('');
    const [messages, setMessages] = useState([]);
    const [chatType, setChatType] = useState(null); // 'user' or 'group'
    
    // New state variables for user public key
    const [selectedUserPublicKey, setSelectedUserPublicKey] = useState(null);
    const [loadingPublicKey, setLoadingPublicKey] = useState(false);
    const [publicKeyError, setPublicKeyError] = useState(null);
    
    // Add state for group members' keys
    const [groupMembersKeys, setGroupMembersKeys] = useState([]);
    const [loadingGroupKeys, setLoadingGroupKeys] = useState(false);
    const [groupKeysError, setGroupKeysError] = useState(null);
    
    // Add state for current user information
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

    // Function to fetch user's public key
    const fetchUserPublicKey = async (rollNumber) => {
        if (!rollNumber) return;
        
        setLoadingPublicKey(true);
        setPublicKeyError(null);
        setSelectedUserPublicKey(null);
        
        try {
            // Extract CSRF token from cookies
            const csrfToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('csrf_access_token='))
                ?.split('=')[1];

            if (!csrfToken) {
                setPublicKeyError("CSRF token not found. Please login again.");
                setLoadingPublicKey(false);
                return;
            }

            // Send request to get user's public key
            const response = await instance.post('/get_user_key', 
                { roll: rollNumber }, 
                {
                    headers: {
                        "X-CSRF-TOKEN": csrfToken
                    }
                }
            );

            // Set the public key
            setSelectedUserPublicKey(response.data.key);
            console.log(`Fetched public key for user ${rollNumber}`);
        } catch (err) {
            console.error('Error fetching user public key:', err);
            setPublicKeyError(
                err.response?.data?.error || 
                'Failed to fetch user public key. Please try again.'
            );
        } finally {
            setLoadingPublicKey(false);
        }
    };

    // Function to fetch group members' public keys
    const fetchGroupMembersKeys = async (groupId) => {
        if (!groupId) return;
        
        setLoadingGroupKeys(true);
        setGroupKeysError(null);
        setGroupMembersKeys([]);
        
        try {
            // Extract CSRF token from cookies
            const csrfToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('csrf_access_token='))
                ?.split('=')[1];

            if (!csrfToken) {
                setGroupKeysError("CSRF token not found. Please login again.");
                setLoadingGroupKeys(false);
                return;
            }

            // Send request to get group members' public keys
            const response = await instance.post('/get_group_keys', 
                { group_id: groupId }, 
                {
                    headers: {
                        "X-CSRF-TOKEN": csrfToken
                    }
                }
            );

            // Set the group members' keys
            setGroupMembersKeys(response.data.keys);
            console.log(`Fetched public keys for group ${groupId} members:`, response.data.keys.length);
        } catch (err) {
            console.error('Error fetching group members public keys:', err);
            setGroupKeysError(
                err.response?.data?.error || 
                'Failed to fetch group members public keys. Please try again.'
            );
        } finally {
            setLoadingGroupKeys(false);
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

        console.log("Messages component mounted with dbKey:", dbKey);
        console.log("Private key available:", privateKey ? "Yes" : "No");
        console.log("Server key available:", serverKey ? "Yes" : "No");

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
    }, [privateKey, dbKey, serverKey, navigate]);

    // Handle selecting a chat (user or group)
    const handleSelectChat = (id, type) => {
        setSelectedChat(id);
        setChatType(type);
        setMessages([]);
        
        // Clear previous key data
        setSelectedUserPublicKey(null);
        setPublicKeyError(null);
        setGroupMembersKeys([]);
        setGroupKeysError(null);
        
        // If selecting a user (DM), fetch their public key
        if (type === 'user') {
            fetchUserPublicKey(id);
        } 
        // If selecting a group, fetch members' public keys
        else if (type === 'group') {
            fetchGroupMembersKeys(id);
        }
    };

    // Generate a random AES key for message encryption
    const generateRandomAESKey = () => {
        // Generate a random 16-byte (128-bit) key
        const randomBytes = CryptoJS.lib.WordArray.random(16);
        return CryptoJS.enc.Base64.stringify(randomBytes);
    };

    // Encrypt data with AES using CBC mode
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
                typeof data === 'string' ? data : JSON.stringify(data),
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

    // Encrypt data with RSA using the receiver's public key
    const encryptWithRSA = (data, publicKey) => {
        if (!data || !publicKey) return null;
        try {
            // Use JSEncrypt for RSA encryption, which is compatible with the backend
            const encrypt = new JSEncrypt();
            encrypt.setPublicKey(publicKey);
            
            // JSEncrypt's encrypt method returns base64 encoded string
            const encryptedData = encrypt.encrypt(data);
            if (!encryptedData) {
                throw new Error("RSA encryption failed");
            }
            
            return encryptedData;
        } catch (error) {
            console.error('RSA encryption failed:', error);
            return null;
        }
    };

    // Handle sending a message
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!messageText.trim() || !selectedChat || !currentUser) return;

        // Add message to the local state for immediate display
        const newMessage = {
            id: Date.now(), // temporary id
            text: messageText,
            sender: currentUser.logged_in_as, // Use actual user roll number
            timestamp: new Date().toISOString(),
        };
        setMessages([...messages, newMessage]);

        // For DM messages, create an encrypted message object for development
        if (chatType === 'user' && selectedUserPublicKey && serverKey) {
            try {
                // Create timestamp
                const timestamp = new Date().toISOString();
                
                // Generate a random AES key for this message
                const messageAESKey = generateRandomAESKey();
                console.log('Random AES key generated for message:', messageAESKey);
                
                // 1. Encrypt sender, timestamp, and receiver using server AES key
                const encryptedSender = encryptWithAES(currentUser.logged_in_as, serverKey);
                const encryptedReceiver = encryptWithAES(selectedChat, serverKey);
                const encryptedTimestamp = encryptWithAES(timestamp, serverKey);
                
                // 2. Encrypt message using the randomly generated AES key
                const encryptedMessage = encryptWithAES(messageText, messageAESKey);
                
                // 3. Encrypt the random AES key with receiver's public key using JSEncrypt
                const encryptedAESKey = encryptWithRSA(messageAESKey, selectedUserPublicKey);
                
                // Verify the encryption worked
                if (!encryptedAESKey) {
                    console.error("RSA encryption of AES key failed!");
                }
                
                // Create the complete encrypted message object
                const encryptedMessageObj = {
                    sender: encryptedSender,
                    receiver: encryptedReceiver,
                    timestamp: encryptedTimestamp,
                    message: encryptedMessage,
                    encrypted_key: encryptedAESKey,
                    group: null // This is a DM, not a group message
                };
                
                // Log the original and encrypted objects for development
                console.log('------ ENCRYPTION DETAILS ------');
                console.log('Original message:', {
                    sender: currentUser.logged_in_as,
                    receiver: selectedChat,
                    timestamp: timestamp,
                    message: messageText,
                    key: messageAESKey
                });
                console.log('Encrypted with server key:', {
                    sender: encryptedSender,
                    receiver: encryptedReceiver,
                    timestamp: encryptedTimestamp
                });
                console.log('Message encrypted with random AES key:', encryptedMessage);
                console.log('Random AES key encrypted with receiver public key using JSEncrypt:', encryptedAESKey);
                console.log('Complete encrypted message object:', encryptedMessageObj);
                console.log('------ END ENCRYPTION DETAILS ------');
                
            } catch (error) {
                console.error('Error encrypting message:', error);
            }
        }
        
        // Clear the input field
        setMessageText('');
    };

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
                <p><strong>DB Key:</strong> {dbKey ? `${dbKey.substring(0, 10)}...` : 'None'}</p>
                <p><strong>Server Key:</strong> {serverKey ? `${serverKey.substring(0, 10)}...` : 'None'}</p>
                <p><strong>Private Key:</strong> {privateKey ? 'Available' : 'None'}</p>
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
                        
                        {/* Display public key info for direct messages */}
                        {chatType === 'user' && (
                            <div className="public-key-info">
                                {loadingPublicKey && <p className="loading-key">Loading public key...</p>}
                                
                                {publicKeyError && (
                                    <div className="key-error">
                                        <p>Error: {publicKeyError}</p>
                                    </div>
                                )}
                                
                                {selectedUserPublicKey && (
                                    <div className="key-display">
                                        <details>
                                            <summary>View {users.find(u => u.roll_number === selectedChat)?.name}'s Public Key</summary>
                                            <div className="key-content">
                                                <pre>{selectedUserPublicKey}</pre>
                                            </div>
                                        </details>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* Display group members' public keys for groups */}
                        {chatType === 'group' && (
                            <div className="group-keys-info">
                                {loadingGroupKeys && <p className="loading-key">Loading group members' keys...</p>}
                                
                                {groupKeysError && (
                                    <div className="key-error">
                                        <p>Error: {groupKeysError}</p>
                                    </div>
                                )}
                                
                                {groupMembersKeys.length > 0 && (
                                    <div className="group-members-keys">
                                        <details>
                                            <summary>View Group Members' Public Keys ({groupMembersKeys.length})</summary>
                                            <div className="members-list">
                                                {groupMembersKeys.map((member, index) => (
                                                    <div key={index} className="member-key-item">
                                                        <h4>Member: {member.roll_number}</h4>
                                                        <details>
                                                            <summary>View Public Key</summary>
                                                            <div className="key-content">
                                                                <pre>{member.public_key}</pre>
                                                            </div>
                                                        </details>
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    </div>
                                )}
                            </div>
                        )}
                        
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
