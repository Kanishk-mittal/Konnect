import { Routes, Route } from 'react-router-dom'

import Landing from './pages/Landing'
import AdminLogin from './pages/AdminLogin'
import StudentLogin from './pages/StudentLogin'
import ClubLogin from './pages/ClubLogin'
import AdminRegistration from './pages/AdminRegistration'
import AdminDashboard from './pages/AdminDashboard'
import AddStudent from './pages/AddStudent'
import RemoveStudent from './pages/RemoveStudent'
import BlockStudents from './pages/BlockStudents'
import UnblockStudents from './pages/UnblockStudents'
import AddGroup from './pages/AddGroup'
import AddClub from './pages/AddClub'
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
        element={<AdminDashboard />}
      />
      <Route path="/admin/add-student"
        element={<AddStudent />}
      />
      <Route path="/admin/remove-student"
        element={<RemoveStudent />}
      />
      <Route path="/admin/block-students"
        element={<BlockStudents />}
      />
      <Route path="/admin/unblock-students"
        element={<UnblockStudents />}
      />
      <Route path="/admin/add-group"
        element={<AddGroup />}
      />
      <Route path="/admin/add-club"
        element={<AddClub />}
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
