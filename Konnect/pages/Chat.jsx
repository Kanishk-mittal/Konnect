import React, { useState } from 'react';
import Header from "../components/Header.jsx";
import Sidebar from '../components/Sidebar.jsx';
import ChatWindow from "../components/ChatWindow.jsx";
import "./Chat.css";

const Chat = () => {
  return (
    <div>
      <div className="header"><Header/></div>
      <div className="content">
        <div className="sidebar">
          <Sidebar />
        </div>
        <div className="Window">
          <ChatWindow />
        </div>
      </div>
    </div>
  );
};

export default Chat;
