import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import React, { useContext, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Test from './pages/Test';
import GetUserKey from './pages/GetUserKey';
import GetGroupKeys from './pages/GetGroupKeys';
import Groups from './pages/Groups';
import Messages from './pages/Messages';
import { AppContext } from './context/AppContext';

const App = () => {
  // This helps us see what's happening with authentication context
  const { privateKey, dbKey } = useContext(AppContext);
  
  useEffect(() => {
    console.log("App rendered. Authentication state:", {
      hasPrivateKey: !!privateKey,
      hasDbKey: !!dbKey
    });
  }, [privateKey, dbKey]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Don't auto-redirect from root path for debugging */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/test" element={<Test />} />
        <Route path="/get-user-key" element={<GetUserKey />} />
        <Route path="/get-group-keys" element={<GetGroupKeys />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/messages" element={<Messages />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
