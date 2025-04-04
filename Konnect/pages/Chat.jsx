import React, { useState, useRef, useEffect, useContext } from 'react';
import Header from "../components/Header.jsx";
import Sidebar from '../components/Sidebar.jsx';
import ChatWindow from "../components/ChatWindow.jsx";
import "./Chat.css";
import { postData } from '../Integration/apiService.js';
import { io } from "socket.io-client";
import { AppContext } from "../src/context/AppContext.jsx";
import CryptoJS from 'crypto-js';
import { decryptWithRSA, generateRSAKeys, decryptWithAES } from '../Integration/Encryption.js';


const Chat = () => {
  const socketRef = useRef(null);
  const rollRef = useRef(null);
  const [error, setError] = useState("")
  const { setSocReady, unsavedMessages, setUnsavedMessages, unreadCount, setunreadCount, selectedChat, selectedChatType, messages, setMessages } = useContext(AppContext);

  const handleReceivedMessage = async (data) => {
    const keys = generateRSAKeys();
    const response = await postData('server_key', { publicKey: keys.publicKey }, { credentials: 'include' });
    const serverKey = decryptWithRSA(response.key, keys.privateKey);
    console.log("Received message:", data);
    // Decrypt sender
    const sender = decryptWithAES(data.sender, serverKey);

    // Decrypt receiver
    const receiver = decryptWithAES(data.receiver, serverKey);

    // Check if group message
    let group = null;
    if (data.group) {
      group = decryptWithAES(data.group, serverKey);
    }
    //decrypt AES key using private RSA key
    const encryptedPrivateKey = localStorage.getItem(`encryptedPrivateKey_${receiver}`)
    const privateKey = decryptWithAES(encryptedPrivateKey, serverKey);

    const decryptedAESKey = decryptWithRSA(data.key, privateKey);

    // Decrypt message using decrypted AES key
    const decryptedMessage = decryptWithAES(data.message, decryptedAESKey);
    //check if the message belong to currently active chat 
    let isActiveChat = false;
    if (selectedChatType === "group" && selectedChat === group) { isActiveChat = true; }
    else if (selectedChatType === "user" && selectedChat === sender) { isActiveChat = true; }
    // creating decrypted message object to display in chat window
    const displayMessage = {
      id: CryptoJS.SHA256(
        sender +
        receiver +
        new Date().getTime().toString()
      ).toString(),
      text: decryptedMessage,
      sender: sender,
      receiver: receiver,
      timestamp: new Date().toISOString(),
      group: group,
      is_seen: isActiveChat ? true : false,
    };
    // handling message according to active window 
    if (isActiveChat) {
      let updatedMessages = [...messages];
      updatedMessages.push(displayMessage);
      setMessages(updatedMessages);
    } else {
      console.log(unreadCount)
      let updatedUnreadCount = [...unreadCount];
      if(updatedUnreadCount[group? group : sender]) {
        updatedUnreadCount[group ? group : sender] += 1;
      }
      else {
        updatedUnreadCount[group ? group : sender] = 1;
      }
      console.log(updatedUnreadCount)
      setunreadCount(updatedUnreadCount);
    }
    // saving unsaved messages to local storage
    let unsavedMessagesCopy = [...unsavedMessages];
    unsavedMessagesCopy.push(displayMessage);
    setUnsavedMessages(unsavedMessagesCopy);
  }

  const setupSocketConnection = async () => {
    // Close existing connection
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    try {
      // Create socket with minimal options (matching the working Messages.jsx)
      socketRef.current = io('http://localhost:5000', {
        withCredentials: true
      });
      socketRef.current.emit('join', { room: rollRef.current });

      // Set up event handlers
      socketRef.current.on('receive_message', handleReceivedMessage);
      socketRef.current.on('message_error', error => setError("Failed to send message"));
      setSocReady(true);
      return true;
    } catch (error) {
      setError("Failed to connect to messaging server");
      return false;
    }
  };

  useEffect(() => {
    const tempFunction = async () => {
      // getting user's roll number
      const userDetails = await postData('user_details', {}, { credentials: 'include' });
      rollRef.current = userDetails.logged_in_as;
      // Setting up socket connection
      const socketConnected = await setupSocketConnection();
      if (!socketConnected) {
        return;
      }
    }
    tempFunction();
  },)


  return (
    <div>
      <div className="header"><Header /></div>
      <div className="content">
        <div className="sidebar">
          <Sidebar />
        </div>
        <div className="Window">
          <ChatWindow socketRef={socketRef} />
        </div>
      </div>
    </div>
  );
};

export default Chat;
