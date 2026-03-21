import { Routes, Route } from 'react-router-dom'

import Landing from './pages/Landing'
import AdminLogin from './pages/AdminLogin'
import StudentLogin from './pages/StudentLogin'
import ClubLogin from './pages/ClubLogin'
import AdminRegistration from './pages/AdminRegistration'
import AdminDashboard from './pages/AdminDashboard'
import ClubDashboard from './pages/ClubDashboard'
import AddStudent from './pages/AddStudent'
import RemoveStudent from './pages/RemoveStudent'
import BlockStudents from './pages/BlockStudents'
import UnblockStudents from './pages/UnblockStudents'
import AddGroup from './pages/AddGroup'
import AddClub from './pages/AddClub'
import AddClubMember from './pages/AddClubMember'
import RemoveClubMember from './pages/RemoveClubMember'
import BlockClubStudents from './pages/BlockClubStudents'
import UnblockClubStudents from './pages/UnblockClubStudents'
import NotFound from './pages/NotFound'
import EditGroupPage from './pages/EditGroup'
import Chat from './pages/Chat'
import ProtectedRoute from './components/ProtectedRoute'
const App = () => {
  return (
    <>
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
        <Route path="/chat"
          element={<Chat />}
        />
        <Route path="/chat/:chatType/:id"
          element={<Chat />}
        />
        <Route path="/club/login"
          element={<ClubLogin />}
        />
        <Route path="/admin/register"
          element={<AdminRegistration />}
        />
        {/* Protected Admin Routes */}
        <Route path="/admin/dashboard"
          element={
            <ProtectedRoute allowedUserTypes={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/admin/add-student"
          element={
            <ProtectedRoute allowedUserTypes={['admin']}>
              <AddStudent />
            </ProtectedRoute>
          }
        />
        <Route path="/admin/remove-student"
          element={
            <ProtectedRoute allowedUserTypes={['admin']}>
              <RemoveStudent />
            </ProtectedRoute>
          }
        />
        <Route path="/admin/block-students"
          element={
            <ProtectedRoute allowedUserTypes={['admin']}>
              <BlockStudents />
            </ProtectedRoute>
          }
        />
        <Route path="/admin/unblock-students"
          element={
            <ProtectedRoute allowedUserTypes={['admin']}>
              <UnblockStudents />
            </ProtectedRoute>
          }
        />
        <Route path="/admin/add-group"
          element={
            <ProtectedRoute allowedUserTypes={['admin']}>
              <AddGroup redirectUrl="/admin/dashboard" editProfileUrl="/admin/edit-profile" />
            </ProtectedRoute>
          }
        />
        <Route path="/admin/group/edit"
          element={
            <ProtectedRoute allowedUserTypes={['admin']}>
              <EditGroupPage redirectUrl="/admin/dashboard" />
            </ProtectedRoute>
          }
        />
        <Route path="/admin/add-club"
          element={
            <ProtectedRoute allowedUserTypes={['admin']}>
              <AddClub />
            </ProtectedRoute>
          }
        />

        {/* Protected Club Routes */}
        <Route path="/club/dashboard"
          element={
            <ProtectedRoute allowedUserTypes={['club']}>
              <ClubDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/club/add-group"
          element={
            <ProtectedRoute allowedUserTypes={['club']}>
              <AddGroup redirectUrl="/club/dashboard" editProfileUrl="/club/edit-profile" />
            </ProtectedRoute>
          }
        />
        <Route path="/club/group/edit"
          element={
            <ProtectedRoute allowedUserTypes={['club']}>
              <EditGroupPage redirectUrl="/club/dashboard" />
            </ProtectedRoute>
          }
        />
        <Route path="/club/add-member"
          element={
            <ProtectedRoute allowedUserTypes={['club']}>
              <AddClubMember />
            </ProtectedRoute>
          }
        />
        <Route path="/club/remove-member"
          element={
            <ProtectedRoute allowedUserTypes={['club']}>
              <RemoveClubMember />
            </ProtectedRoute>
          }
        />
        <Route path="/club/block-students"
          element={
            <ProtectedRoute allowedUserTypes={['club']}>
              <BlockClubStudents />
            </ProtectedRoute>
          }
        />
        <Route path="/club/unblock-students"
          element={
            <ProtectedRoute allowedUserTypes={['club']}>
              <UnblockClubStudents />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

export default App
