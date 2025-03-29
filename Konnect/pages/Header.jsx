import styles from "./Header.module.css";
import notification from "../src/assets/notification.png";
import setting from "../src/assets/setting.png";
import profile from "../src/assets/profile.png";

function Header() {
    return (
        <header className={styles.headhome}>
            <div className={styles.logo}>KON</div>
            <div className={styles.logo1}>NET</div>

            <div className={styles.notifications}>
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
