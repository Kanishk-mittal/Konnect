import React, { createContext, useState } from 'react';

// Create the App Context
export const AppContext = createContext();

// Create the App Provider component
export const AppProvider = ({ children }) => {
  // State for encryption keys
  const [privateKey, setPrivateKey] = useState(null);
  const [dbKey, setDbKey] = useState(null);
  const [serverKey, setServerKey] = useState(null);

  // Create the context value object
  const contextValue = {
    // Keys
    privateKey,
    dbKey,
    serverKey,
    
    // Setters
    setPrivateKey,
    setDbKey,
    setServerKey
  };

  // Provide the context to children components
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};
