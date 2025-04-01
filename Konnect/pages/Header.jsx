import styles from "./Header.module.css";
import notification from "../src/assets/notification.png";
import setting from "../src/assets/setting.png";
import profile from "../src/assets/profile.png";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useContext } from "react";
import { AppContext } from "../src/context/AppContext";
import { getAllUnreadCounts } from "./ChatUtils.jsx";

function Header() {
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);
    const { dbKey } = useContext(AppContext);
    const [dbRef, setDbRef] = useState(null);

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
            
            const response = await fetch('/api/protected', {
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

    const handleNotificationClick = () => {
        navigate("/notification");
    };

    return (
        <header className={styles.headhome}>
            <div className={styles.logo}>KON</div>
            <div className={styles.logo1}>NET</div>

            <div 
                className={styles.notifications} 
                onClick={handleNotificationClick}
                style={{ cursor: 'pointer', position: 'relative' }}
            >
                <img src={notification} alt="notification" />
                {unreadCount > 0 && (
                    <div className={styles.notificationBadge}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </div>
                )}
            </div>

            <div className={styles.settings}>
                <img src={setting} alt="settings" />
            </div>

            <div className={styles.profile}>
                <img src={profile} alt="profile" />
            </div>
        </header>
    );
}

export default Header;
