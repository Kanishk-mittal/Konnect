import React, { useState, useEffect, useContext, useRef } from "react";
import MessageInput from "../pages/MessageInput.jsx";
import { AppContext } from "../src/context/AppContext.jsx";
import CryptoJS, { enc, SHA256 } from "crypto-js";
import "./ChatWindow.css";
import { postData, instance } from "../Integration/apiService.js";
import { generateRSAKeys, decryptWithRSA, encryptWithAES, decryptWithAES, generateAESKey,encryptWithRSA } from "../Integration/Encryption.js";


const ChatWindow = ({ socketRef}) => {  
  // Database reference
  const dbRef = useRef(null);
  //Server key reference
  const serverKey = useRef(null);
  // Messages container reference for scrolling
  const messagesContainerRef = useRef(null);
  // Database key reference
  const dbKey = useRef(null);
  // private key reference
  const privateKey = useRef(null);
  // roll number reference 
  const roll = useRef(null);

  const [dbReady, setDbReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [chatName, setChatName] = useState("");
  // loading context 
  const { setMessages,
    messages,
    unreadCount,
    setunreadCount,
    socReady,
    selectedChat,
    selectedChatType,
    unsavedMessages,
    setUnsavedMessages } = useContext(AppContext)

  // Initialize IndexedDB
  const initializeDB = async() => {
    // gettign userinfo
    if (roll.current === null) {
      const userDetails = await postData('user_details', {}, { credentials: 'include' });
      roll.current = userDetails.logged_in_as;
      
    }
    const dbName = `messagesDB_${roll.current}`;
    const request = indexedDB.open(dbName, 1);
    request.onerror = (event) => {
      // Error handler
    };
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('messages')) {
        const store = db.createObjectStore('messages', { keyPath: 'id' });
        store.createIndex('sender', 'sender', { unique: false });
        store.createIndex('receiver', 'receiver', { unique: false });
        store.createIndex('group', 'group', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('is_seen', 'is_seen', { unique: false });
      }
    };
    request.onsuccess = (event) => {
      dbRef.current = event.target.result;
      setDbReady(true);
    };
    request.onblocked = () => {
      alert("Please close all other tabs with this site open!");
    };
  };

  // load keys
  const loadKeys = async () => {
    const userDetails = await postData('user_details', {}, { credentials: 'include' });
    roll.current = userDetails.logged_in_as;
    const keys = generateRSAKeys();
    const response = await postData('server_key', { publicKey: keys.publicKey }, { credentials: 'include' });
    serverKey.current = decryptWithRSA(response.key, keys.privateKey);
    const encryptedPrivateKey = localStorage.getItem(`encryptedPrivateKey_${roll.current}`);
    const encryptedAESKey = localStorage.getItem(`encryptedAESKey_${roll.current}`);
    if (!encryptedPrivateKey || !encryptedAESKey) {
      return;
    }
    try {
      // Decrypt the private key
      const decryptedPrivateKey = decryptWithAES(encryptedPrivateKey, serverKey.current);
      if (decryptedPrivateKey && decryptedPrivateKey.includes("-----BEGIN RSA PRIVATE KEY-----")) {
        privateKey.current = decryptedPrivateKey;
        // Decrypt the AES key
        const decryptedAESKey = decryptWithAES(encryptedAESKey, serverKey.current);
        if (decryptedAESKey) {
          dbKey.current = decryptedAESKey;
          return true;
        }
      }
    } catch (error) {
      // Error handling
    }
  }
  
  // Save message to IndexedDB
  // TODO Check this one 
  const saveMessageToDB = async(message) => {
    if (!dbRef.current) {
      return;
    }
    const encryptedMessage = encryptWithAES(message.text, dbKey.current);
    const messageToStore = {
      ...message,
      text: encryptedMessage,
    };
    const transaction = dbRef.current.transaction(['messages'], 'readwrite');
    const store = transaction.objectStore('messages');
    const request = store.put(messageToStore);
    request.onerror = (event) => {
      // Error handling
    }
  };

  // Fetch messages from IndexedDB for a specific chat
  const fetchMessagesFromDB = (chatId, type) => {
    if (!dbRef.current) {
      return;
    }
    setIsLoading(true);

    if (unreadCount[chatId]) {
      const updatedUnreadCount = { ...unreadCount };
      updatedUnreadCount[chatId] = 0;
      setunreadCount(updatedUnreadCount);
    }
    
    const transaction = dbRef.current.transaction(['messages'], 'readwrite'); // Changed to readwrite to update is_seen
    const store = transaction.objectStore('messages');
    console.log(type)
    if (type === 'user') {
      // For user chats, fetch both sent and received messages
      const allMessages = [];
      
      // Get messages where the user is sender
      const senderIndex = store.index('sender');
      const senderRequest = senderIndex.getAll(roll.current);
      
      senderRequest.onsuccess = () => {
        allMessages.push(...senderRequest.result);
        
        // Get messages where the user is receiver
        const receiverIndex = store.index('receiver');
        const receiverRequest = receiverIndex.getAll(roll.current);
        
        receiverRequest.onsuccess = () => {
          allMessages.push(...receiverRequest.result);
          
          // Filter relevant messages between current user and selected chat
          const relevantMessages = allMessages.filter(msg => 
            ((msg.sender === chatId && msg.receiver === roll.current) || 
            (msg.sender === roll.current && msg.receiver === chatId)) &&
            msg.group === null // Exclude group messages from DM conversations
          );
          
          // Mark all received messages as seen since user is viewing the chat
          for (const msg of relevantMessages) {
            if (msg.receiver === roll.current && !msg.is_seen) {
              // Mark message as seen
              msg.is_seen = true;
              // Update in database
              store.put(msg);
            }
          }
          
          // Sort by timestamp
          relevantMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          
          // Decrypt message text
          const decryptedMessages = relevantMessages.map(msg => {
            try {
              return {
                ...msg,
                text: decryptWithAES(msg.text, dbKey.current),
              };
            } catch (error) {
              return {
                ...msg,
                text: "Error: Message could not be decrypted",
                sender: "Error"
              };
            }
          });
          setMessages(decryptedMessages);
          setIsLoading(false);
        };
      };
    } else if (type === 'group') {
      console.log("Fetching group messages for chatId2:", chatId);
      // For group chats, fetch by group ID
      const groupIndex = store.index('group');
      const request = groupIndex.getAll(chatId);
      
      request.onsuccess = () => {
        const messages = request.result;
        console.log("Fetched group messages:", messages);
        
        // Mark all received messages as seen since user is viewing the chat
        for (const msg of messages) {
          if (!msg.is_seen) {
            // Mark message as seen
            msg.is_seen = true;
            // Update in database
            store.put(msg);
          }
        }
        
        // Sort by timestamp
        const sortedMessages = messages.sort((a, b) => 
          new Date(a.timestamp) - new Date(b.timestamp)
        );
        
        // Decrypt message text
        const decryptedMessages = sortedMessages.map(msg => {
          try {
            return {
              ...msg,
              text: decryptWithAES(msg.text, dbKey.current),
            };
          } catch (error) {
            return {
              ...msg,
              text: "Error: Message could not be decrypted",
              sender: "Error"
            };
          }
        });
        
        setMessages(decryptedMessages);
        setIsLoading(false);
      };
    }
  };

  // Get chat name from users or groups array
  const getChatName = async (chatId, type) => {
    try {
      if (type === 'user') {
        const response = await postData('get_users', {}, { credentials: 'include' });
        const users = response.users;
        const user = users.find(u => u.roll_number === chatId);
        return user ? user.name : chatId;
      } else if (type === 'group') {
        const response = await postData('get_user_groups', {}, { credentials: 'include' });
        const groups = response.groups;
        const group = groups.find(g => g.id === chatId);
        return group ? group.name : chatId;
      }
      return chatId;
    } catch (err) {
      return chatId;
    }
  };

  // Get user public key
  const getUserKey = async (userId) => { 
    const response = await postData('get_user_key', { roll: userId }, { credentials: 'include' });
    if (response) {
      return response.key;
    } else {
      return null;
    }
  };

  // Get group member keys
  const getGroupKeys = async (groupId) => {
    const response = await postData('get_group_keys', { group_id: groupId }, { credentials: 'include' });
    console.log("Group keys response:", response);
    return response;
    
  };

  // Create message object - wrapper for the utility function
  // Create message object
  const createMessageUtil = (currentUser, receiver, message, publicKey, group = null,) => {
    // Create a unique message ID using CryptoJS
    const messageId = CryptoJS.SHA256(
      currentUser +
      receiver +
      message +
      new Date().getTime().toString()
    ).toString();
    
    const aesKey = generateAESKey();
    
    return {
      id: messageId,
      sender: currentUser,
      receiver: receiver,
      text: message,
      timestamp: new Date().toISOString(),
      group: group,
      key: aesKey,
      receiverPublicKey: publicKey,
    };
  };
  const createMessage = (receiver, message, publicKey, group = null) => {
    return createMessageUtil(roll.current, receiver, message, publicKey, group);
  };

  // Create encrypted packet for sending - wrapper for the utility function
  const createPacket = async (message) => {
    // Encrypt the message using AES
    if (!serverKey.current) {
      const keys = generateRSAKeys();
      const response = await postData('server_key', { publicKey: keys.publicKey }, { credentials: 'include' });
      serverKey.current = decryptWithRSA(response.key, keys.privateKey);
    }
    const aesKey = message.key;
    const encryptedMessage = encryptWithAES(message.text, aesKey);

    const encryptedKey = encryptWithRSA(aesKey, message.receiverPublicKey);

    // Encrypt sender, receiver and group with server AES key
    const encryptedSender = encryptWithAES(message.sender, serverKey.current);
    const encryptedReceiver = encryptWithAES(message.receiver, serverKey.current);
    let encryptedGroup = message.group;

    if (message.group) {
      console.log("Encrypting group:", message.group);
      encryptedGroup = encryptWithAES(message.group, serverKey.current);
      console.log("Encrypted group:", encryptedGroup);
    }

    // Create the packet
    return {
      message: encryptedMessage,
      key: encryptedKey,
      sender: encryptedSender,
      receiver: encryptedReceiver,
      group: encryptedGroup,
      timestamp: message.timestamp
    };
  };

  // Send message via socket
  const sendMessage = async (message) => {
    console.log("Sending message:", message);
    const packet = await createPacket(message);
    console.log(packet)
    
    if (socketRef.current && socketRef.current.connected) {
      console.log("Socket is connected, sending message:", packet);
      socketRef.current.emit('send_message', packet);
    } else {
      setError('Message not sent please try again ')
    }
  };

  // Load messages when chat selection changes
  useEffect(() => {
    if (selectedChat && selectedChat) {
      setIsLoading(true);
      // Fetch chat name
      getChatName(selectedChat, selectedChatType).then(name => {
        setChatName(name);
        // Fetch messages for this chat
        fetchMessagesFromDB(selectedChat, selectedChatType);
      });
    } else {
      setMessages([]);
    }
    setIsLoading(false);
  }, [selectedChat, selectedChatType]);

  // Handle sending a new message
  const handleSendMessage = async (text) => {
    if (!text.trim() || !selectedChat ) return;
    
    try {
      let messageArray = [];
      // Generate a consistent message ID for display and database storage       
      if (selectedChatType === 'user') {
        // Direct message to user
        const publicKey = await getUserKey(selectedChat);
        if (!publicKey) {
          setError("Couldn't get recipient's public key");
          return;
        }
        
        const messageObject = createMessage(selectedChat, text, publicKey);
        messageArray.push(messageObject);
      } else {
        // Group message
        const response = await getGroupKeys(selectedChat);
        const keys = response.keys;
        if (!keys.length) {
          setError("Couldn't get group members' keys");
          return;
        }
        
        // Create message objects for each recipient
        for (let i = 0; i < keys.length; i++) {
          const publicKey = keys[i].public_key;
          const receiver = keys[i].roll_number;
          
          // Skip creating a message for the current user
          if (receiver === roll.current) continue;
          
          // Create message with unique transmission ID but preserve consistent database ID
          const messageObject = createMessage(receiver, text, publicKey, selectedChat);
          messageArray.push(messageObject);
        }
      }
      
      if (messageArray.length > 0) {
        // Create a display message that we'll save to IndexedDB
        const displayMessage = {
          // Use the consistent ID for database storage
          id: CryptoJS.SHA256(
            roll.current +
            messageArray[0].receiver +
            new Date().getTime().toString()
          ).toString(),
          text: text,
          sender: roll.current,
          receiver: messageArray[0].receiver,
          timestamp: new Date().toISOString(),
          group: selectedChatType === 'group' ? selectedChat : null,
          is_seen: true 
        };
        // Save to IndexedDB
        await saveMessageToDB(displayMessage);

        // Update UI with the new message
        setMessages(messages => [...messages, displayMessage]);

        // Send encrypted messages
        for (let i = 0; i < messageArray.length; i++) {
          sendMessage(messageArray[i]);
        }

        // Scroll to bottom
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }
    } catch (error) {
      console.error(error)
      setError("Failed to send message: " + error.message);
    }
  };

  const handleReceivedMessage = (data) => { 
    const sender = decryptWithAES(data.sender, serverKey.current);
    const receiver = decryptWithAES(data.receiver, serverKey.current);
    let group = null;
    if (data.group) {
      group = decryptWithAES(data.group, serverKey.current);
    }
    // get AES key form the packet
    const decryptedAESKey = decryptWithRSA(data.key, privateKey.current);

    const decryptedMessage = decryptWithAES(data.message, decryptedAESKey);

    // check if the message belong to the currently active caht 
    let idStrign = "";
    let isCurrentChat = true;
    if (selectedChat && chatType) {
      if (chatType === 'user' && selectedChat !== sender) {
        isCurrentChat = false;
        idStrign = `${sender}${receiver}${data.message}`;
      } else if (chatType === 'group' && group !== selectedChat) {
        idStrign = `${sender}${group}${data.message}`;
        isCurrentChat = false;
      }
    }
    const messageId = SHA256(idStrign).toString();
    const newMessage = {
      id: messageId,
      text: decryptedMessage,
      sender: sender,
      receiver: receiver,
      timestamp: data.timestamp,
      group: group,
      is_seen: isCurrentChat ? true : false,
    };
    if (!isCurrentChat) {
      const updatedUnreadCount = { ...unreadCount };
      if (!updatedUnreadCount[group]) {
        updatedUnreadCount[group] = 0;
      }
      updatedUnreadCount[group] += 1;
      setunreadCount(updatedUnreadCount);
    }
    else {
      setMessages(prevMessages => [
        ...prevMessages, 
        newMessage
      ]);
    }
    // Save to IndexedDB
    let newUnread = { ...unsavedMessages };
    newUnread.push(newMessage);
    setUnsavedMessages(newUnread);
  }
  const formatMessageDate = (timestamp) => {
    const messageDate = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return "Today";
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return messageDate.toLocaleDateString();
    }
  };
  const groupMessagesByDate = (messages) => {
    const groups = {};
    messages.forEach(message => {
      const date = formatMessageDate(message.timestamp);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push({
        ...message,
        time: formatMessageTime(message.timestamp),
        date
      });
    });
    return groups;
  };
  const formatMessageTime = (timestamp) => {
    const messageDate = new Date(timestamp);
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  // Get grouped messages using the utility function
  const messageGroups = groupMessagesByDate(messages);
  //use Effect for loading keys and initializing DB
  useEffect(() => {
    const loadKeysAndInitDB = async () => {
      const keysLoaded = await loadKeys();
      if (keysLoaded) {
        await initializeDB();
        setDbReady(true);
      }
    };
    loadKeysAndInitDB();
  }, [])
  // use Effect for incoming messages
  useEffect(() => {
    if (!socReady) {
      return;
    }
    socketRef.current.on('receive_message', { room: roll.current }, async (packet) => { 
      handleReceivedMessage(packet);
    })
  }, [socReady])
  // use Effect for savign message
  useEffect(() => {
    if (unsavedMessages.length > 0 && dbReady) {
      unsavedMessages.forEach(message => {
        saveMessageToDB(message);
      });
      setUnsavedMessages([]);
    }
  }, [unsavedMessages, dbReady])
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);
  return (
    <div className="chat-window">
      <div className="chat-header">
        <img src="../src/assets/profile.png" alt="profile" className="chat-avatar" />
        <div>
          <h3>{chatName}</h3>
          <p className="status">
            {selectedChat ? (selectedChatType === 'user' ? 'Direct Message' : 'Group Chat') : 'No chat selected'}
          </p>
        </div>
      </div>
      {error ? (
        <div className="messages-container error">
          <p className="error-message">{error}</p>
        </div>
      ) : isLoading ? (
        <div className="messages-container loading">
          <p>Loading messages...</p>
        </div>
      ) : !selectedChat ? (
        <div className="messages-container empty-state">
          <p>Select a chat to start messaging</p>
        </div>
      ) : (
        <>
          <div className="messages-container" ref={messagesContainerRef}>
            {Object.keys(messageGroups).map(date => (
              <React.Fragment key={date}>
                <div className="date-label">{date}</div>
                {messageGroups[date].map((msg, index) => (
                  <div key={msg.id || index} className={`message-container ${msg.sender === roll.current ? 'user' : 'friend'}`}>
                    <div className="message-bubble">
                      {msg.text}
                      <span className="message-time">{msg.time}</span>
                    </div>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
          <div className="Message-bar">
            <MessageInput onSend={handleSendMessage} />
          </div>
        </>
      )}
    </div>
  );
};
export default ChatWindow;