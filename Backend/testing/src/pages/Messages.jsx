import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import './Messages.css';
import { AppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

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
    
    // Get context values
    const { privateKey, dbKey } = useContext(AppContext);
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

        const fetchData = async () => {
            setLoading(true);
            try {
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

    // Handle sending a message
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!messageText.trim() || !selectedChat) return;

        // Add message to the local state for immediate display
        const newMessage = {
            id: Date.now(), // temporary id
            text: messageText,
            sender: 'me', // In a real app, this would be the current user's ID
            timestamp: new Date().toISOString(),
        };
        setMessages([...messages, newMessage]);

        // Here you would send the message to the backend
        // using socket.io or an API call

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
                <p><strong>Authentication:</strong> {dbKey ? 'Authenticated' : 'Not authenticated'}</p>
                <p><strong>DB Key:</strong> {dbKey ? `${dbKey.substring(0, 10)}...` : 'None'}</p>
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
                                        className={`message ${message.sender === 'me' ? 'sent' : 'received'}`}
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
