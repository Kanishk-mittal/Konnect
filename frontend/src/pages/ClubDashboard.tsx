import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../store/store';
import { getData } from '../api/requests';
import { setUserId } from '../store/authSlice';
import Header from "../components/Header";
import ThreePanelSplitLayout from '../components/split/ThreePanelSplitLayout';
import ClubMembersPanel from '../components/split/ClubMembersPanel';
import ClubBlockedStudentsPanel from '../components/split/ClubBlockedStudentsPanel';
import ClubGroupsPanel from '../components/split/ClubGroupsPanel';

interface Member {
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

const ClubDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const authState = useSelector((state: RootState) => state.auth);
  const theme = useSelector((state: RootState) => state.theme.theme);
  const { userId } = authState;
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [memberSearchText, setMemberSearchText] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [blockedStudents, setBlockedStudents] = useState<Member[]>([]);
  const [blockedStudentsLoading, setBlockedStudentsLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

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

  // Filter members based on search text
  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(memberSearchText.toLowerCase()) ||
    member.rollNumber.toLowerCase().includes(memberSearchText.toLowerCase())
  );

  useEffect(() => {
    const fetchClubDetails = async () => {
      try {
        let response;

        if (userId) {
          // If userId is available, use the existing endpoint
          response = await getData(`/club/details/${userId}`);
        } else {
          // If userId is not available, get club details from JWT
          response = await getData(`/club/details`);
        }

        if (response.status) {
          setClubId(response.data.clubId || userId);

          // If userId wasn't available but we got it from JWT, store it too
          if (!userId && response.data.clubId) {
            dispatch(setUserId(response.data.clubId));
          }
        }
      } catch (error) {
        console.error('Error fetching club details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClubDetails();
  }, [userId, dispatch]);

  // Fetch data when club details are available
  useEffect(() => {
    const fetchMembers = async () => {
      if (!clubId) return;

      setMembersLoading(true);
      try {
        const response = await getData(`/club/members/${clubId}`);
        if (response.status) {
          setMembers(response.data);
        }
      } catch (error) {
        console.error('Error fetching club members:', error);
        setMembers([]);
      } finally {
        setMembersLoading(false);
      }
    };

    const fetchBlockedStudents = async () => {
      if (!clubId) return;

      setBlockedStudentsLoading(true);
      try {
        const response = await getData(`/club/blocked/${clubId}`);
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
      if (!clubId) return;

      setGroupsLoading(true);
      try {
        const response = await getData(`/club/groups/${clubId}`);
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

    fetchMembers();
    fetchBlockedStudents();
    fetchGroups();
  }, [clubId]);

  // Check club authentication
  useEffect(() => {
    const checkClubAuth = async () => {
      try {
        const response = await getData('/club/userID');
        // If successful, user is authenticated as club
        if (response && response.userId) {
          // Set authenticated to true in Redux
          dispatch({ type: 'auth/setAuthenticated', payload: true });
          // Optionally set userId if not already set
          if (!authState.userId) {
            dispatch({ type: 'auth/setUserId', payload: response.userId });
          }
        }
      } catch (error) {
        // If failed, user is not authenticated as club, redirect
        console.error('Club authentication failed. Redirecting to home...');
        navigate('/');
      }
    };

    checkClubAuth();
  }, [navigate, dispatch, authState.userId]);

  return (
    <div className="flex flex-col h-screen" style={{
      background: backgroundGradient
    }}>
      <div style={headerBackground}>
        <Header editProfileUrl="/club/edit-profile" />
      </div>

      {loading ? (
        <h1 className={`text-2xl font-bold mb-4 ${textColor}`}>Loading...</h1>
      ) : clubId ? (
        <ThreePanelSplitLayout
          leftPanel={
            <ClubMembersPanel
              members={filteredMembers}
              membersLoading={membersLoading}
              memberSearchText={memberSearchText}
              setMemberSearchText={setMemberSearchText}
              textColor={textColor}
              theme={theme as 'light' | 'dark'}
              navigate={navigate}
              leftSectionColor={leftSectionColor}
            />
          }
          rightTopPanel={
            <ClubBlockedStudentsPanel
              blockedStudents={blockedStudents}
              blockedStudentsLoading={blockedStudentsLoading}
              textColor={textColor}
              theme={theme as 'light' | 'dark'}
              navigate={navigate}
              topRightSectionColor={topRightSectionColor}
            />
          }
          rightBottomPanel={
            <ClubGroupsPanel
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
        <h1 className={`text-2xl font-bold mb-4 ${textColor}`}>Club Dashboard</h1>
      )}
    </div>
  )
}

export default ClubDashboard
