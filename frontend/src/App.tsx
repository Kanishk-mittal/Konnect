import { Routes, Route } from 'react-router-dom'

import Landing from './pages/Landing'
import AdminLogin from './pages/AdminLogin'
import StudentLogin from './pages/StudentLogin'
import ClubLogin from './pages/ClubLogin'
import AdminRegistration from './pages/AdminRegistration'
import AdminDashboard from './pages/AdminDashboard'
import NotFound from './pages/NotFound'


const App = () => {
  return (
    <Routes>
      <Route path="/"
        element={<Landing />}
      />
      <Route path="/admin/login"
        element={<AdminLogin />}
      />
      <Route path="/student/login"
        element={<StudentLogin />}
      />
      <Route path="/club/login"
        element={<ClubLogin />}
      />
      <Route path="/admin/register"
        element={<AdminRegistration />}
      />
      <Route path="/admin/dashboard"
        element={<AdminDashboard/>} 
      />
      <Route path="*" element={<NotFound/>} />
    </Routes>
  )
}

export default App
