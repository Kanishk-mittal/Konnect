import styles from "./Header.module.css";
import notification from "../src/assets/notification.png";
import setting from "../src/assets/setting.png";
import profile from "../src/assets/profile.png";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AppContext } from "../src/context/AppContext.jsx";;

const Header = () => {
    const navigate = useNavigate();
    const {unreadCount} = useContext(AppContext);

    return (
        <header className={styles.headhome}>
            <div 
                onClick={()=>navigate('/chat')} 
                style={{ cursor: 'pointer', display: 'flex' }}
            >
                <div className={styles.logo}>KON</div>
                <div className={styles.logo1}>NECT</div>
            </div>

            <div 
                className={styles.notifications} 
                onClick={()=>navigate('/notifications')}
                style={{ cursor: 'pointer', position: 'relative' }}
            >
                <img src={notification} alt="notification" />
            </div>

            <div className="notification-area">
                <div className="notification-icon">
                    <i className="fa fa-bell"></i>
                    {unreadCount > 0 && (
                        <span className="notification-badge" style={{color:'black'}}>{unreadCount}</span>
                    )}
                </div>
            </div>

            <div className={styles.settings}
                onClick={() => navigate("/psettings")}>
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
