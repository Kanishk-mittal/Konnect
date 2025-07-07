import { Routes, Route } from 'react-router-dom'

import Landing from './pages/Landing'
import AdminLogin from './pages/AdminLogin'
import StudentLogin from './pages/StudentLogin'
import ClubLogin from './pages/ClubLogin'
import AdminRegistration from './pages/AdminRegistration'
import AdminDashboard from './pages/AdminDashboard'

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
      <Route path="/otp-verification"
        element={<div>OTP Verification Page</div>} // Placeholder for OTP Verification component
      />
      <Route path="/admin/dashboard"
        element={<AdminDashboard/>} // Placeholder for Admin Dashboard component
      />
      <Route path="*" element={<div>404 - Page Not Found</div>} />
    </Routes>
  )
}

export default App
