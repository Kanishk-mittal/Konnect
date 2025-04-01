import React from 'react';
import styles from './Notification.module.css';

const NotificationCard = ({ image, title, message, onClick, timestamp, altText = "Notification" }) => {
  // Truncate message to 50 characters if longer
  const truncatedMessage = message && message.length > 50 
    ? `${message.substring(0, 50)}...` 
    : message;
    
  // Format timestamp if provided
  const formattedTime = timestamp ? new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  }) : null;

  return (
    <div className={styles.notification} onClick={onClick}>
      <div className={styles.image}>
        <img src={image} width="80px" height="80px" alt={altText} />
      </div>
      <div className={styles.content}>
        <p className={styles.bigtext}>{title}</p>
        <p className={styles.smalltext}>{truncatedMessage}</p>
        {timestamp && (
          <p className={styles.timestamp}>{formattedTime}</p>
        )}
      </div>
    </div>
  );
};

export default NotificationCard;
