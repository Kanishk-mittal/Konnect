import React, { useEffect, useState, useContext } from 'react';
import styles from "./Notification.module.css";
import Header from "./Header.jsx";
import { useNavigate } from 'react-router-dom';
import { AppContext } from "../src/context/AppContext";
import axios from "axios";
import API_BASE_URL from "../Integration/apiConfig.js";
import { formatMessageDate, decryptWithAES } from "./ChatUtils.jsx";
import wildbeatslogo from "../src/assets/Profilepic.png";
import NotificationCard from "./NotificationCard.jsx";

function Notification() {
  const [notifications, setNotifications] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasUnread, setHasUnread] = useState(false);
  const navigate = useNavigate();
  const { dbKey } = useContext(AppContext);
  const [dbRef, setDbRef] = useState(null);
  const [users, setUsers] = useState({});
  const [groups, setGroups] = useState({});

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
  useEffect(() => {
    const request = indexedDB.open('messagesDB', 1);
    
    request.onsuccess = (event) => {
      setDbRef(event.target.result);
    };
    
    request.onerror = (event) => {
      setError('Failed to open message database');
      setLoading(false);
    };
  }, []);

  // Fetch user data from API
  const fetchUsers = async () => {
    try {
      const response = await instance.get('/get_users');
      const userMap = {};
      response.data.users.forEach(user => {
        userMap[user.roll_number] = user;
      });
      setUsers(userMap);
    } catch (err) {
      console.error('Failed to load users');
    }
  };

  // Fetch group data from API
  const fetchGroups = async () => {
    try {
      const response = await instance.get('/get_user_groups');
      const groupMap = {};
      response.data.groups.forEach(group => {
        groupMap[group.id] = group;
      });
      setGroups(groupMap);
    } catch (err) {
      console.error('Failed to load groups');
    }
  };

  // Get current user info
  const fetchCurrentUserInfo = async () => {
    try {
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf_access_token='))
        ?.split('=')[1];

      if (!csrfToken) {
        throw new Error("Authentication token not found");
      }

      const response = await instance.post('/protected', {}, {
        headers: { "X-CSRF-TOKEN": csrfToken }
      });
      
      return response.data;
    } catch (err) {
      setError("Failed to authenticate");
      return null;
    }
  };

  // Fetch unread messages from IndexedDB
  const fetchUnreadMessages = async (currentUserId) => {
    if (!dbRef) return {};
    
    return new Promise((resolve, reject) => {
      const transaction = dbRef.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      const receiverIndex = store.index('receiver');
      const request = receiverIndex.getAll(currentUserId);
      
      request.onsuccess = () => {
        const messages = request.result;
        
        // Filter for unread messages
        const unreadMessages = messages.filter(msg => !msg.is_seen);
        
        if (unreadMessages.length > 0) {
          setHasUnread(true);
        }
        
        // Decrypt message content
        const decryptedMessages = unreadMessages.map(msg => {
          try {
            return {
              ...msg,
              text: decryptWithAES(msg.text, dbKey)
            };
          } catch (error) {
            return {
              ...msg,
              text: "Encrypted message"
            };
          }
        });
        
        // Sort all messages by timestamp (newest first)
        decryptedMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Group by date
        const groupedMessages = {};
        decryptedMessages.forEach(msg => {
          const date = formatMessageDate(msg.timestamp);
          if (!groupedMessages[date]) {
            groupedMessages[date] = [];
          }
          groupedMessages[date].push(msg);
        });
        
        resolve(groupedMessages);
      };
      
      request.onerror = (error) => {
        reject('Error fetching unread messages: ' + error);
      };
    });
  };

  // Load all required data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Load users and groups first
        await Promise.all([fetchUsers(), fetchGroups()]);
        
        // Get current user info
        const currentUser = await fetchCurrentUserInfo();
        if (!currentUser) throw new Error('Failed to get current user');
        
        // Wait for database to be initialized
        if (!dbRef) return;
        
        // Fetch unread messages
        const unreadMessages = await fetchUnreadMessages(currentUser.logged_in_as);
        setNotifications(unreadMessages);
        setLoading(false);
      } catch (err) {
        setError(err.message || 'Failed to load notifications');
        setLoading(false);
      }
    };
    
    if (dbRef) loadData();
  }, [dbRef]);

  // Navigate to chat when notification is clicked
  const handleNotificationClick = (sender, group) => {
    if (group) {
      // Navigate to group chat
      navigate('/chat', { state: { selectedChat: group, chatType: 'group' } });
    } else {
      // Navigate to direct message
      navigate('/chat', { state: { selectedChat: sender, chatType: 'user' } });
    }
  };

  // Render unread message notifications
  const renderUnreadNotifications = () => {
    // Create an array of dates sorted by recency (newest first)
    const sortedDates = Object.keys(notifications).sort((a, b) => {
      // Put "Today" first, then "Yesterday", then other dates
      if (a === "Today") return -1;
      if (b === "Today") return 1;
      if (a === "Yesterday") return -1;
      if (b === "Yesterday") return 1;
      
      // For other dates, compare them as dates
      return new Date(b) - new Date(a);
    });
    
    return (
      <>
        {sortedDates.map(date => (
          <div className={styles.dateGroup} key={date}>
            <p className={styles.heading}>{date}</p>
            
            <div className={styles.notificationsList}>
              {notifications[date].map(message => {
                const isGroupMessage = message.group !== null;
                const senderName = isGroupMessage 
                  ? groups[message.group]?.name || "Unknown Group"
                  : users[message.sender]?.name || "Unknown User";
                
                return (
                  <NotificationCard
                    key={message.id}
                    image={wildbeatslogo}
                    title={isGroupMessage ? `New Message in ${senderName}` : `New Message from ${senderName}`}
                    message={message.text}
                    timestamp={message.timestamp}
                    onClick={() => handleNotificationClick(message.sender, message.group)}
                    altText="Message"
                  />
                );
              })}
            </div>
          </div>
        ))}
      </>
    );
  };

  // Render static placeholder notifications
  const renderStaticNotifications = () => {
    return (
      <>
        <p className={styles.heading}>Notifications</p>
        <NotificationCard
          image={wildbeatslogo}
          title="New Event"
          message="Cyber Awareness Workshop - 25th March 2025"
          altText="Event Logo"
        />
        
        <NotificationCard
          image={wildbeatslogo}
          title="New Post"
          message="WildBeats is hosting a live performance this weekend! Don't miss it!"
          altText="Event Logo"
        />

        {/* Static notifications from last month */}
        <p className={styles.heading}>Last month</p>

        <NotificationCard
          image={wildbeatslogo}
          title="Upcoming Live Performance"
          message="Get ready for a live performance from [Artist Name]! Secure your tickets today and be part of the experience."
          altText="Event Logo"
        />
        
        <NotificationCard
          image={wildbeatslogo}
          title="Community Feedback Session"
          message="Join our community feedback session on [Date]. Your thoughts are important in shaping our future events."
          altText="Event Logo"
        />
        
        <NotificationCard
          image={wildbeatslogo}
          title="Monthly Newsletter Released"
          message="Check out our latest newsletter for updates, insights, and upcoming events."
          altText="Event Logo"
        />
      </>
    );
  };

  // Render empty state notification with original theme
  const renderEmptyNotification = () => {
    return (
      <>
        <p className={styles.heading}>Notifications</p>
        <div className={styles.emptyContainer}>
          <NotificationCard
            image={wildbeatslogo}
            title="Nothing to show here"
            message="You don't have any notifications at the moment."
            altText="Empty"
          />
        </div>
      </>
    );
  };

  return (
    <div className={styles.notificationpage}>
      <header className={styles.header}>
        <Header />
      </header>
      <div className={styles.theme}>
        {loading ? (
          <>
            <p className={styles.heading}>Notifications</p>
            <div className={styles.loadingContainer}>
              <p>Loading notifications...</p>
            </div>
          </>
        ) : error ? (
          <>
            <p className={styles.heading}>Error</p>
            <div className={styles.errorContainer}>
              <p className={styles.errorText}>{error}</p>
            </div>
          </>
        ) : hasUnread ? (
          renderUnreadNotifications()
        ) : (
          renderEmptyNotification() // Changed from renderStaticNotifications to show empty state
        )}
      </div>
    </div>
  );
}

export default Notification;
