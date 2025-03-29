import Header from "./Header.jsx";
import styles from "./Psettings.module.css";

function Psettings() {
  return (
    <div className={styles.fullpage}>
      <div className={styles.settingsPage}>
      <div className={styles.header}>
        <Header/>
      </div>
      <div className={styles.profileSettings}>
        <p> Profile Settings </p>
      </div>
      <div className={styles.username}>
        <div className={styles.name}>
          <p> User name </p>
        </div>
        <div className={styles.userform}>
          <form>
          <input type="text" id="username"/>
          </form>
        </div>
      </div>
      <div className={styles.personalmobile}>
        <div className={styles.name}>
          <p> Personal Mobile </p>
        </div>
        <div className={styles.userform}>
          <form>
          <input type="text" id="username"/>
          </form>
        </div>
      </div>
      <div>
      <p className={styles.name}>About</p>
      <textarea className={styles.text2}></textarea>
      </div>                                                                          
      <button type="button" className={`${styles.btn} ${styles.btn1}`}>Save</button>
    </div>
    </div>
  );
}

export default Psettings;
