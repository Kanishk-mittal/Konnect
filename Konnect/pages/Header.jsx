import styles from "./Header.module.css";
import notification from "../src/assets/notification.png";
import setting from "../src/assets/setting.png";
import profile from "../src/assets/profile.png";
import { useNavigate } from "react-router-dom";

function Header() {
    const navigate = useNavigate();

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
                style={{ cursor: 'pointer' }}
            >
                <img src={notification} alt="notification" />
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
