
import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../store/store';
import { getData } from '../api/requests';
import { setUserId, setAdminDetails } from '../store/authSlice';
import Header from "../components/Header"
import SplitLayout from '../components/split/SplitLayout';
import AllStudentsPanel from '../components/split/AllStudentsPanel';
import BlockedStudentsPanel from '../components/split/BlockedStudentsPanel';
import GroupsPanel from '../components/split/GroupsPanel';
import ClubsPanel from '../components/split/ClubsPanel';

interface Student {
  id: string;
  rollNumber: string;
  name: string;
  profilePicture: string | null;
  isBlocked: boolean;
}

interface Group {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  type: 'chat' | 'announcement';
  memberCount: number;
  adminCount?: number;
  createdAt: string;
}

interface Club {
  id: string;
  name: string;
  email: string;
}

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const authState = useSelector((state: RootState) => state.auth);
  const theme = useSelector((state: RootState) => state.theme.theme);
  const { userId, adminDetails } = authState;
  const [loading, setLoading] = useState(true);
  const [studentSearchText, setStudentSearchText] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [blockedStudents, setBlockedStudents] = useState<Student[]>([]);
  const [blockedStudentsLoading, setBlockedStudentsLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubsLoading, setClubsLoading] = useState(false);


  // Define theme-specific colors
  const backgroundGradient = theme === 'dark'
    ? 'linear-gradient(180deg, #000000 0%, #0E001B 8%)'
    : 'linear-gradient(180deg, #9435E5 0%, #FFD795 8%)';

  const textColor = theme === 'dark' ? 'text-white' : 'text-black';

  const headerBackground = theme === 'dark'
    ? {} // No background for dark theme
    : { background: 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 100%)' };

  // Section colors based on theme
  const leftSectionColor = theme === 'dark' ? '#1f2937' : '#FFC362';
  const topRightSectionColor = theme === 'dark' ? '#dc2626' : '#FFA162';
  const bottomRightSectionColor = theme === 'dark' ? '#1f2937' : '#FFC362';

  // Filter students based on search text
  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(studentSearchText.toLowerCase()) ||
    student.rollNumber.toLowerCase().includes(studentSearchText.toLowerCase())
  );

  useEffect(() => {
    const fetchAdminDetails = async () => {
      // If adminDetails already exist in Redux, no need to fetch
      if (adminDetails) {
        setLoading(false);
        return;
      }

      try {
        const response = await getData(`/user/details`);

        if (response.status) {
          // Store admin details in Redux
          dispatch(setAdminDetails({
            username: response.data.username,
            email: response.data.email,
            collegeCode: response.data.collegeCode
          }));

          // Store userId from response if not already in Redux
          if (!userId && response.data.userId) {
            dispatch(setUserId(response.data.userId));
          }
        }
      } catch (error) {
        console.error('Error fetching admin details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminDetails();
  }, [userId, adminDetails, dispatch]);

  // Fetch students when admin details are available
  useEffect(() => {
    const fetchStudents = async () => {
      if (!adminDetails?.collegeCode) return;

      setStudentsLoading(true);
      try {
        const response = await getData(`/student/list`);
        if (response.status) {
          setStudents(response.data);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
        setStudents([]);
      } finally {
        setStudentsLoading(false);
      }
    };

    const fetchBlockedStudents = async () => {
      if (!adminDetails?.collegeCode) return;

      setBlockedStudentsLoading(true);
      try {
        const response = await getData(`/student/blocked`);
        if (response.status) {
          setBlockedStudents(response.data);
        }
      } catch (error) {
        console.error('Error fetching blocked students:', error);
        setBlockedStudents([]);
      } finally {
        setBlockedStudentsLoading(false);
      }
    };

    const fetchGroups = async () => {
      if (!adminDetails?.collegeCode) return;

      setGroupsLoading(true);
      try {
        const response = await getData(`/groups/`);
        if (response.status) {
          setGroups(response.data);
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
        setGroups([]);
      } finally {
        setGroupsLoading(false);
      }
    };

    const fetchClubs = async () => {
      if (!adminDetails?.collegeCode) return;

      setClubsLoading(true);
      try {
        const response = await getData(`/club/${adminDetails.collegeCode}`);
        if (response.status) {
          setClubs(response.data);
        }
      } catch (error) {
        console.error('Error fetching clubs:', error);
        setClubs([]);
      } finally {
        setClubsLoading(false);
      }
    };

    fetchStudents();
    fetchBlockedStudents();
    fetchGroups();
    fetchClubs();
  }, [adminDetails]);

  // Check admin authentication
  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const response = await getData('/admin/userID');
        // If successful, user is authenticated as admin
        if (response && response.userId) {
          // Set authenticated to true in Redux
          dispatch({ type: 'auth/setAuthenticated', payload: true });
          // Optionally set userId if not already set
          if (!authState.userId) {
            dispatch({ type: 'auth/setUserId', payload: response.userId });
          }
        }
      } catch (error) {
        // If failed, user is not authenticated as admin, redirect
        console.error('Admin authentication failed. Redirecting to home...');
        navigate('/');
      }
    };

    checkAdminAuth();
  }, [navigate, dispatch, authState.userId]);

  return (
    <div className="flex flex-col h-screen" style={{
      background: backgroundGradient
    }}>
      <div style={headerBackground}>
        <Header />
      </div>

      {loading ? (
        <h1 className={`text-2xl font-bold mb-4 ${textColor}`}>Loading...</h1>
      ) : adminDetails ? (
        <SplitLayout
          leftTopPanel={
            <AllStudentsPanel
              students={filteredStudents}
              studentsLoading={studentsLoading}
              studentSearchText={studentSearchText}
              setStudentSearchText={setStudentSearchText}
              textColor={textColor}
              theme={theme as 'light' | 'dark'}
              navigate={navigate}
              leftSectionColor={leftSectionColor}
            />
          }
          leftBottomPanel={
            <ClubsPanel
              theme={theme as 'light' | 'dark'}
              backgroundColor={leftSectionColor}
              navigate={navigate}
              clubs={clubs}
              clubsLoading={clubsLoading}
              textColor={textColor}
            />
          }
          rightTopPanel={
            <BlockedStudentsPanel
              blockedStudents={blockedStudents}
              blockedStudentsLoading={blockedStudentsLoading}
              textColor={textColor}
              theme={theme as 'light' | 'dark'}
              navigate={navigate}
              topRightSectionColor={topRightSectionColor}
            />
          }
          rightBottomPanel={
            <GroupsPanel
              theme={theme as 'light' | 'dark'}
              backgroundColor={bottomRightSectionColor}
              navigate={navigate}
              groups={groups}
              groupsLoading={groupsLoading}
              textColor={textColor}
            />
          }
        />
      ) : (
        <h1 className={`text-2xl font-bold mb-4 ${textColor}`}>Admin Dashboard</h1>
      )}
    </div>
  )
}

export default AdminDashboard
