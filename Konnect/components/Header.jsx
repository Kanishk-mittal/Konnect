import styles from "./Header.module.css";
import notification from "../src/assets/notification.png";
import setting from "../src/assets/setting.png";
import profile from "../src/assets/profile.png";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AppContext } from "../src/context/AppContext.jsx";
import { postData } from "../Integration/apiService.js";
;

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

            <div className={styles.notifications}
                onClick={() => navigate("/psettings")}>
                <img src={setting} alt="settings" />
            </div>

            <div className={styles.profile}
                onClick={() => navigate("/profile")}>
                <img src={profile} alt="profile" />
            </div>
            <button 
                className={styles.logoutButton} 
                onClick = {()=>{
                    postData('logout', {}, { credentials: 'include' });
                    navigate('/');
                }}
                style={{
                    cursor: 'pointer',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    padding: '10px 15px',
                    borderRadius: '5px',
                    marginLeft: '10px'
                }}
            >
                Logout
            </button>
        </header>
    );
};

export default Header;
