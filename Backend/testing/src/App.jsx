import { BrowserRouter, Routes, Route } from 'react-router-dom';
import React from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Test from './pages/Test';
import GetUserKey from './pages/GetUserKey';
import GetGroupKeys from './pages/GetGroupKeys';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/test" element={<Test />} />
        <Route path="/get-user-key" element={<GetUserKey />} />
        <Route path="/get-group-keys" element={<GetGroupKeys />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
