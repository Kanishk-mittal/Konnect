import React, { useContext, useState } from 'react';
import { AppContext } from '../src/context/AppContext';
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";
import ChatWindow from "./ChatWindow.jsx";
import "./Chat1.css";

const Chat1 = () => {
  // State to track selected chat
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatType, setChatType] = useState(null);

  // Get context values if needed by component logic
  const { privateKey, dbKey, serverKey } = useContext(AppContext);

  // Handle chat selection from sidebar
  const handleSelectChat = (chatId, type) => {
    setSelectedChat(chatId);
    setChatType(type);
  };

  return (
    <div>
      <div className="header"><Header /></div>
      <div className="content">
        <div className="sidebar">
          <Sidebar onSelectChat={handleSelectChat} />
        </div>
        <div className="Window">
          <ChatWindow 
            selectedChat={selectedChat} 
            chatType={chatType} 
          />
        </div>
      </div>
    </div>
  );
};

export default Chat1;
