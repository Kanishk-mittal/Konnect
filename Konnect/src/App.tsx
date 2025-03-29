import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from '../pages/Login.jsx';
import Chat1 from '../pages/Chat1.jsx';
import Psettings from "../pages/Psettings.jsx";
import Notifications from "../pages/Notification.jsx";
import ProfilePage from "../pages/ProfilePage.jsx";
import Settings from "../pages/Settings.jsx";
import Header from '../pages/Header.jsx'
import Landing from '../pages/landing.jsx';
import Loginnew from '../pages/Loginnew.jsx';
import Register from '../pages/Register.jsx';
import './App.css'

function App() {

  return (
    <>
    <BrowserRouter>
    <Routes>
    <Route path="/" element={<Landing/>} />
    <Route path="/login" element={<Loginnew/>} />
    <Route path="/register" element={<Register/>} />
    <Route path="/chat" element={<Chat1/>} />
    </Routes>
     </BrowserRouter>
    </>
  )
}

export default App
