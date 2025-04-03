import React, { createContext, useState } from 'react';

// Create the App Context
export const AppContext = createContext();

// Create the App Provider component
export const AppProvider = ({ children }) => {
  // State for encryption keys
  const [selectedChat, setselectedChat] = useState();
  const [selectedChatType, setselectedChatType] = useState();
  const [unreadCount, setunreadCount] = useState(0);

  // Create the context value object
  const contextValue = {
    // State variables
    selectedChat,
    unreadCount,
    selectedChatType,
    
    // Setters
    setselectedChat,
    setunreadCount,
    setselectedChatType,
  };

  // Provide the context to children components
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};
