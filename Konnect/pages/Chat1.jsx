import React from "react";
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";
import ChatWindow from "./ChatWindow.jsx";
import "./Chat1.css";

const Chat1 = () => {
  return (
    <div>
      <div className="header"><Header /></div>
      <div className="content">
        <div className="sidebar"><Sidebar /></div>
        <div className="Window"><ChatWindow /></div>
      </div>
    </div>
  );
};

export default Chat1;
