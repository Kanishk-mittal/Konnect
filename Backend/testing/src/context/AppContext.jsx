import { createContext, useState } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [privateKey, setPrivateKey] = useState(null);
  const [dbKey, setDbKey] = useState(null);

  const value = {
    privateKey,
    dbKey,
    setPrivateKey,
    setDbKey
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
