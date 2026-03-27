import { useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../store/store';
import { getData } from '../api/requests';
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
  icon?: string;
  user_id: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { profile, status: userStatus } = useSelector((state: RootState) => state.user);
  const theme = useSelector((state: RootState) => state.theme.theme);

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

  // Fetch dashboard data when the user profile is loaded
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!profile?.collegeCode) return;

      // Fetch all data in parallel
      setStudentsLoading(true);
      setBlockedStudentsLoading(true);
      setGroupsLoading(true);
      setClubsLoading(true);

      try {
        const [
          studentsRes,
          blockedStudentsRes,
          groupsRes,
          clubsRes
        ] = await Promise.all([
          getData(`/student/list`),
          getData(`/student/blocked`),
          getData(`/groups/`),
          getData(`/club/${profile.collegeCode}`)
        ]);

        if (studentsRes.status) setStudents(studentsRes.data);
        if (blockedStudentsRes.status) setBlockedStudents(blockedStudentsRes.data);
        if (groupsRes.status) setGroups(groupsRes.data);
        if (clubsRes.status) setClubs(clubsRes.data);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setStudentsLoading(false);
        setBlockedStudentsLoading(false);
        setGroupsLoading(false);
        setClubsLoading(false);
      }
    };

    if (userStatus === 'succeeded' && profile) {
      fetchDashboardData();
    }
  }, [profile, userStatus]);



  return (
    <div className="flex flex-col h-screen" style={{
      background: backgroundGradient
    }}>
      <div style={headerBackground}>
        <Header />
      </div>

      {userStatus === 'loading' ? (
        <h1 className={`text-2xl font-bold mb-4 ${textColor}`}>Loading Dashboard...</h1>
      ) : profile ? (
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
              basePath="admin"
            />
          }
        />
      ) : (
        <h1 className={`text-2xl font-bold mb-4 ${textColor}`}>Could not load Admin Dashboard. Please try logging in again.</h1>
      )}
    </div>
  )
}

export default AdminDashboard
