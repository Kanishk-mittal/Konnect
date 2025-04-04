import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from '../pages/Login.jsx';
import Chat from '../pages/Chat.jsx';
import Psettings from "../pages/Psettings.jsx";
import Notifications from "../pages/Notification.jsx";
import ProfilePage from "../pages/ProfilePage.jsx";
import Landing from '../pages/landing.jsx';
import Register from '../pages/Register.jsx';
import AppProvider from "./context/AppContext.jsx";
import './App.css'

function App() {
  return (
    <>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login/>} />
            <Route path="/register" element={<Register />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/notification" element={<Notifications />} />
            <Route path="/psettings" element={<Psettings />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </>
  )
}

export default App
