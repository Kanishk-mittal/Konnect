import styles from "./Header.module.css";
import notification from "../src/assets/notification.png";
import setting from "../src/assets/setting.png";
import profile from "../src/assets/profile.png";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useContext } from "react";
import { AppContext } from "../src/context/AppContext";
import { getAllUnreadCounts } from "./ChatUtils.jsx";
import API_BASE_URL from "../Integration/apiConfig.js"; // Import API base URL
import { color } from "framer-motion";

const Header = () => {
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);
    const { dbKey } = useContext(AppContext);
    const [dbRef, setDbRef] = useState(null);
    const [totalUnread, setTotalUnread] = useState(0);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        // Initialize IndexedDB connection
        const request = indexedDB.open('messagesDB', 1);
        
        request.onsuccess = (event) => {
            setDbRef(event.target.result);
        };
        
        // Set up listener for message updates
        const handleMessagesUpdate = () => {
            if (dbRef) fetchUnreadCount();
        };
        
        window.addEventListener('messagesUpdate', handleMessagesUpdate);
        
        return () => {
            window.removeEventListener('messagesUpdate', handleMessagesUpdate);
        };
    }, []);
    
    // Fetch unread count whenever dbRef changes
    useEffect(() => {
        if (dbRef) {
            fetchUnreadCount();
            
            // Refresh unread count periodically
            const interval = setInterval(fetchUnreadCount, 10000);
            return () => clearInterval(interval);
        }
    }, [dbRef]);
    
    const fetchUnreadCount = async () => {
        try {
            // Get current user info
            const csrfToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('csrf_access_token='))
                ?.split('=')[1];
                
            if (!csrfToken) return;
            
            // FIXED: Use API_BASE_URL instead of relative /api/protected path
            const response = await fetch(`${API_BASE_URL}/protected`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken
                },
                credentials: 'include'
            });
            
            if (!response.ok) return;
            
            const userData = await response.json();
            if (!userData || !userData.logged_in_as) return;
            
            // Get unread counts from IndexedDB
            const counts = await getAllUnreadCounts(dbRef, userData.logged_in_as);
            
            // Calculate total unread count
            let total = 0;
            Object.values(counts).forEach(item => {
                total += item.count;
            });
            
            setUnreadCount(total);
        } catch (error) {
            console.error("Error fetching unread count:", error);
        }
    };

    // Set up listeners for message events
    useEffect(() => {
        const handleNewMessage = (event) => {
            const { sender, chatId, type, message } = event.detail;
            
            // Add to notifications list
            setNotifications(prev => [
                { 
                    id: Date.now(),
                    sender,
                    chatId,
                    type,
                    message,
                    timestamp: new Date().toISOString()
                },
                ...prev.slice(0, 4) // Keep only the 5 most recent
            ]);
            
            // Increment total unread counter
            setTotalUnread(count => count + 1);
        };
        
        const handleMessagesUpdate = () => {
            // Recalculate total unread from IndexedDB
            fetchUnreadCountFromDB().then(count => {
                setTotalUnread(count);
            });
        };
        
        // Listen for new message notifications
        window.addEventListener('newMessage', handleNewMessage);
        // Listen for messages being read
        window.addEventListener('messagesUpdate', handleMessagesUpdate);
        
        return () => {
            window.removeEventListener('newMessage', handleNewMessage);
            window.removeEventListener('messagesUpdate', handleMessagesUpdate);
        };
    }, []);

    // Function to fetch unread count from IndexedDB
    const fetchUnreadCountFromDB = async () => {
        // Implementation would depend on your IndexedDB structure
        // This is just a placeholder
        return 0;
    };

    const handleNotificationClick = () => {
        navigate("/notification");
    };
    const handlePsettingsClick = () => {
        navigate("/psettings");
    }
    
    const handleLogoClick = () => {
        navigate("/chat");
    }

    return (
        <header className={styles.headhome}>
            <div 
                onClick={handleLogoClick} 
                style={{ cursor: 'pointer', display: 'flex' }}
            >
                <div className={styles.logo}>KON</div>
                <div className={styles.logo1}>NECT</div>
            </div>

            <div 
                className={styles.notifications} 
                onClick={handleNotificationClick}
                style={{ cursor: 'pointer', position: 'relative' }}
            >
                <img src={notification} alt="notification" />
            </div>

            <div className="notification-area">
                <div className="notification-icon">
                    <i className="fa fa-bell"></i>
                    {totalUnread > 0 && (
                        <span className="notification-badge" style={{color:'black'}}>{totalUnread}</span>
                    )}
                </div>
            </div>

            <div className={styles.settings}
                onClick={handlePsettingsClick}>
                <img src={setting} alt="settings" />
            </div>

            <div className={styles.profile}
                onClick={() => navigate("/profile")}>
                <img src={profile} alt="profile" />
            </div>
        </header>
    );
};

export default Header;
