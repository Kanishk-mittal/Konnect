import CryptoJS from "crypto-js";
import JSEncrypt from "jsencrypt";

// Encrypt with AES
export const encryptWithAES = (message, key) => {
  // Decode base64 AES key
  const keyBytes = CryptoJS.enc.Base64.parse(key);

  // Generate a random IV
  const iv = CryptoJS.lib.WordArray.random(16);

  // Encrypt message using AES-CBC
  const encrypted = CryptoJS.AES.encrypt(message, keyBytes, {
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
    iv: iv
  });

  // Combine IV and ciphertext, then encode as base64
  return CryptoJS.enc.Base64.stringify(iv.concat(encrypted.ciphertext));
};

// Decrypt AES encrypted message
export const decryptWithAES = (encryptedData, key) => {
  try {
    // Decode the base64 string
    const ciphertext = CryptoJS.enc.Base64.parse(encryptedData);
    
    // Extract IV (first 16 bytes)
    const iv = CryptoJS.lib.WordArray.create(
      ciphertext.words.slice(0, 4),
      16
    );
    
    // Extract actual ciphertext
    const encryptedMessage = CryptoJS.lib.WordArray.create(
      ciphertext.words.slice(4),
      ciphertext.sigBytes - 16
    );
    
    // Decrypt using AES
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: encryptedMessage },
      CryptoJS.enc.Base64.parse(key),
      { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
    );
    
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    return 'Error decrypting message';
  }
};

// Generate AES key for secure messaging
export const generateAESKey = () => {
  // Generate a random 16-byte (128-bit) key
  const randomBytes = CryptoJS.lib.WordArray.random(16);
  return CryptoJS.enc.Base64.stringify(randomBytes);
};

// Decrypt RSA encrypted key
export const decryptRSAKey = (encryptedKey, privateKey) => {
  try {
    const decrypt = new JSEncrypt();
    decrypt.setPrivateKey(privateKey);
    return decrypt.decrypt(encryptedKey);
  } catch (error) {
    return null;
  }
};

// Create message object
export const createMessage = (currentUser, receiver, message, publicKey, group = null, consistentDbId = null) => {
  // Create a unique message ID using CryptoJS
  const messageId = consistentDbId || CryptoJS.SHA256(
    currentUser.logged_in_as +
    receiver +
    message +
    new Date().getTime().toString()
  ).toString();
  
  const aesKey = generateAESKey();
  
  return {
    id: messageId,
    sender: currentUser.logged_in_as,
    receiver: receiver,
    text: message,
    timestamp: new Date().toISOString(),
    group: group,
    key: aesKey,
    receiverPublicKey: publicKey,
    consistentDbId: consistentDbId  // Store this for later reference
  };
};

// Create encrypted packet for sending
export const createPacket = (message, serverKey) => {
  // Encrypt the message using AES
  const aesKey = message.key;
  const publicKey = message.receiverPublicKey;
  const encryptedMessage = encryptWithAES(message.text, aesKey);
  
  // Encrypt the AES key using RSA
  const rsaEncoder = new JSEncrypt();
  rsaEncoder.setPublicKey(publicKey);
  const encryptedKey = rsaEncoder.encrypt(aesKey);
  
  // Encrypt sender, receiver and group with server AES key
  const encryptedSender = encryptWithAES(message.sender, serverKey);
  const encryptedReceiver = encryptWithAES(message.receiver, serverKey);
  let encryptedGroup = message.group;
  
  if (message.group) {
    encryptedGroup = encryptWithAES(message.group, serverKey);
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

// Format timestamps for display
export const formatMessageTime = (timestamp) => {
  const messageDate = new Date(timestamp);
  return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Format date for message grouping
export const formatMessageDate = (timestamp) => {
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

// Group messages by date
export const groupMessagesByDate = (messages) => {
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

// Get unread messages count for a specific chat
export const getUnreadCountByChatId = (db, currentUserId, chatId, type) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      console.warn('Database not initialized');
      resolve(0); // Return 0 instead of rejecting
      return;
    }
    
    // Check if the 'messages' object store exists
    if (!Array.from(db.objectStoreNames).includes('messages')) {
      console.warn("Messages object store doesn't exist yet");
      resolve(0); // Return 0 count
      return;
    }
    
    try {
      const transaction = db.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      let request;
      
      if (type === 'user') {
        // For user chats, check if receiver index exists
        if (!store.indexNames.contains('receiver')) {
          console.warn("Receiver index doesn't exist in messages store");
          resolve(0);
          return;
        }
        // For user chats, we only want direct messages where receiver is current user
        const receiverIndex = store.index('receiver');
        request = receiverIndex.getAll(currentUserId);
      } else if (type === 'group') {
        // For group chats, check if group index exists
        if (!store.indexNames.contains('group')) {
          console.warn("Group index doesn't exist in messages store");
          resolve(0);
          return;
        }
        // For group chats, we filter by group ID
        const groupIndex = store.index('group');
        request = groupIndex.getAll(chatId);
      } else {
        console.warn('Invalid chat type');
        resolve(0);
        return;
      }
      
      request.onsuccess = () => {
        const messages = request.result;
        
        // Filter messages based on criteria
        const unreadMessages = messages.filter(msg => {
          if (type === 'user') {
            return msg.receiver === currentUserId && 
                  msg.sender === chatId && 
                  !msg.is_seen && 
                  msg.group === null;
          } else if (type === 'group') {
            return msg.receiver === currentUserId && 
                  !msg.is_seen && 
                  msg.group === chatId;
          }
          return false;
        });
        
        resolve(unreadMessages.length);
      };
      
      request.onerror = (error) => {
        console.error('Error getting unread messages:', error);
        resolve(0); // Resolve with 0 on error instead of rejecting
      };
    } catch (err) {
      console.error('Error accessing database:', err);
      resolve(0); // Resolve with 0 on any error
    }
  });
};

// Get all unread counts for all chats
export const getAllUnreadCounts = (db, currentUserId) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      console.warn('Database not initialized');
      resolve({}); // Return empty counts object instead of rejecting
      return;
    }
    
    // Check if the 'messages' object store exists
    if (!db.objectStoreNames.contains('messages')) {
      console.warn("Messages object store doesn't exist yet");
      resolve({}); // Return empty counts object
      return;
    }
    
    try {
      const transaction = db.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      
      // Check if 'receiver' index exists
      if (!store.indexNames.contains('receiver')) {
        console.warn("Receiver index doesn't exist in messages store");
        resolve({});
        return;
      }
      
      const receiverIndex = store.index('receiver');
      const request = receiverIndex.getAll(currentUserId);
      
      request.onsuccess = () => {
        const messages = request.result;
        const unreadCounts = {};
        
        // Count unread messages by sender (for user chats)
        messages.forEach(msg => {
          if (!msg.is_seen) {
            if (msg.group === null) {
              // Direct message
              if (!unreadCounts[msg.sender]) {
                unreadCounts[msg.sender] = { count: 0, type: 'user' };
              }
              unreadCounts[msg.sender].count++;
            } else {
              // Group message
              if (!unreadCounts[msg.group]) {
                unreadCounts[msg.group] = { count: 0, type: 'group' };
              }
              unreadCounts[msg.group].count++;
            }
          }
        });
        
        resolve(unreadCounts);
      };
      
      request.onerror = (error) => {
        console.error('Error getting unread counts:', error);
        resolve({}); // Resolve with empty object on error instead of rejecting
      };
    } catch (err) {
      console.error('Error accessing database:', err);
      resolve({}); // Resolve with empty object on any error
    }
  });
};

// Mark all messages as read for a specific chat
export const markMessagesAsRead = (db, currentUserId, chatId, type) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      console.warn('Database not initialized');
      resolve(0);
      return;
    }
    
    // Check if the 'messages' object store exists
    if (!Array.from(db.objectStoreNames).includes('messages')) {
      console.warn("Messages object store doesn't exist yet");
      resolve(0);
      return;
    }
    
    try {
      const transaction = db.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      let request;
      
      if (type === 'user') {
        // Check if receiver index exists
        if (!store.indexNames.contains('receiver')) {
          console.warn("Receiver index doesn't exist in messages store");
          resolve(0);
          return;
        }
        const receiverIndex = store.index('receiver');
        request = receiverIndex.getAll(currentUserId);
      } else if (type === 'group') {
        // Check if group index exists
        if (!store.indexNames.contains('group')) {
          console.warn("Group index doesn't exist in messages store");
          resolve(0);
          return;
        }
        const groupIndex = store.index('group');
        request = groupIndex.getAll(chatId);
      } else {
        console.warn('Invalid chat type');
        resolve(0);
        return;
      }
      
      request.onsuccess = () => {
        const messages = request.result;
        let updatedCount = 0;
        
        // Filter and update unread messages
        const updatePromises = messages.filter(msg => {
          if (type === 'user') {
            return msg.receiver === currentUserId && 
                  msg.sender === chatId && 
                  !msg.is_seen && 
                  msg.group === null;
          } else if (type === 'group') {
            return msg.receiver === currentUserId && 
                  !msg.is_seen && 
                  msg.group === chatId;
          }
          return false;
        }).map(msg => {
          return new Promise((resolveUpdate) => {
            msg.is_seen = true;
            const updateRequest = store.put(msg);
            
            updateRequest.onsuccess = () => {
              updatedCount++;
              resolveUpdate();
            };
            
            updateRequest.onerror = () => {
              resolveUpdate(); // Continue even if one update fails
            };
          });
        });
        
        Promise.all(updatePromises).then(() => {
          resolve(updatedCount);
        });
      };
      
      request.onerror = (error) => {
        console.error('Error getting messages to mark as read:', error);
        resolve(0); // Resolve with 0 on error instead of rejecting
      };
    } catch (err) {
      console.error('Error accessing database:', err);
      resolve(0); // Resolve with 0 on any error
    }
  });
};
