import React, { useState } from "react";
import MessageInput from "./MessageInput";
import "./ChatWindow.css";

const ChatWindow = () => {
  const [messages, setMessages] = useState([
    { text: "Hello and thanks for signing up to the course. 😊", sender: "friend", time: "10:20 AM", date: "Today" },
    { text: "Hello, Good Evening.", sender: "user", time: "10:25 AM", date: "Today" },
    { text: "I'm Zafor", sender: "user", time: "10:26 AM", date: "Today" },
    { text: "I only have a small doubt about your lecture. Can you give me some time for this?", sender: "user", time: "10:28 AM", date: "Today" }
  ]);

  const sendMessage = (text) => {
    const newMessage = {
      text,
      sender: "user",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      date: "Today"
    };
    setMessages([...messages, newMessage]);
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <img src="../src/assets/profile.png" alt="profile" className="chat-avatar" />
        <div>
          <h3>Jane Cooper</h3>
          <p className="status">Active Now</p>
        </div>
      </div>

      <div className="messages-container">
        <div className="date-label">Today</div>
        {messages.map((msg, index) => (
          <div key={index} className={`message-container ${msg.sender}`}>
            <div className="message-bubble">
              {msg.text}
              <span className="message-time">{msg.time}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="Message-bar"><MessageInput onSend={sendMessage} /></div>
    </div>
  );
};

export default ChatWindow;
