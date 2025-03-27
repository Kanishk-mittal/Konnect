import { createContext, useState } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [privateKey, setPrivateKey] = useState(null);
  const [dbKey, setDbKey] = useState(null);
  const [serverKey, setServerKey] = useState(null); // Add server key for server-client communication

  const value = {
    privateKey,
    dbKey,
    serverKey,
    setPrivateKey,
    setDbKey,
    setServerKey
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
