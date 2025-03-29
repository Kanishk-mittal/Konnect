import React from 'react';
import styles from "./Notification.module.css";
import Header from "./Header.jsx";
import wildbeatslogo from "../src/assets/Profilepic.png";

function Notification() {
  return (
    <div className={styles.notificationpage} >
      <header className={styles.header}>
        <Header />
      </header>
      <div className={styles.theme}>
      <p className={styles.heading}>Notifications</p>
      <div className={styles.notification}>
        <div className={styles.image}>
          <img src={wildbeatslogo} width="80px" height="80px" alt="Event Logo" />
        </div>
        <div className={styles.content}>
          <p className={styles.bigtext}>New Event</p>
          <p className={styles.smalltext}>Cyber Awareness Workshop - 25th March 2025</p>
        </div>
      </div>

      <div className={styles.notification}>
        <div className={styles.image}>
          <img src={wildbeatslogo} width="80px" height="80px" alt="Event Logo" />
        </div>
        <div className={styles.content}>
          <p className={styles.bigtext}>New Post</p>
          <p className={styles.smalltext}>"WildBeats is hosting a live performance this weekend! Don't miss it!"</p>
        </div>
      </div>

      {/* Static notifications from last month */}
      <p className={styles.heading}>Last month</p>

      <div className={styles.notification}>
        <div className={styles.image}>
          <img src={wildbeatslogo} width="80px" height="80px" alt="Event Logo" />
        </div>
        <div className={styles.content}>
          <p className={styles.bigtext}>Upcoming Live Performance</p>
          <p className={styles.smalltext}>Get ready for a live performance from [Artist Name]! Secure your tickets today and be part of the experience.</p>
        </div>
      </div>

      <div className={styles.notification}>
        <div className={styles.image}>
          <img src={wildbeatslogo} width="80px" height="80px" alt="Event Logo" />
        </div>
        <div className={styles.content}>
          <p className={styles.bigtext}>Community Feedback Session</p>
          <p className={styles.smalltext}>Join our community feedback session on [Date]. Your thoughts are important in shaping our future events.</p>
        </div>
      </div>

      <div className={styles.notification}>
        <div className={styles.image}>
          <img src={wildbeatslogo} width="80px" height="80px" alt="Event Logo" />
        </div>
        <div className={styles.content}>
          <p className={styles.bigtext}>Monthly Newsletter Released</p>
          <p className={styles.smalltext}>Check out our latest newsletter for updates, insights, and upcoming events.</p>
        </div>
      </div>
      </div>
    </div>
  );
}

export default Notification;
