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
import GroupsPanel from '../components/split/GroupsPanel';

interface Member {
    id: string;
    rollNumber: string;
    name: string;
    profilePicture: string | null;
    isBlocked: boolean;
    position?: string;
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
      // Only fetch if clubId is not already loaded
      if (clubId) {
        setLoading(false);
        return;
      }

      // If already authenticated as a club (guaranteed by ProtectedRoute), fetch details
      if (authState.isAuthenticated && authState.userType === 'club') {
          try {
            const response = await getData(`/user/details`); // This already gets the full details

            if (response.status) {
                setClubId(response.data.userId);
                // userId and userType are already set by PersistentLogin
            }
          } catch (error) {
            console.error('Error fetching club details:', error);
          } finally {
            setLoading(false);
          }
      } else {
          // If not authenticated or not club (should not happen due to ProtectedRoute), stop loading
          setLoading(false);
      }
    };

    fetchClubDetails();
  }, [clubId, authState.isAuthenticated, authState.userType]);

    // Fetch data when club details are available
    useEffect(() => {
        const fetchMembers = async () => {
            if (!clubId) return;

            setMembersLoading(true);
            try {
                const response = await getData(`/club/members`);
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
                const response = await getData(`/club/blocked`);
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
                const response = await getData(`/club/groups`);
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

  

    return (
        <div className="flex flex-col h-screen" style={{
            background: backgroundGradient
        }}>
            <div style={headerBackground}>
                <Header />
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
                            clubId={clubId || undefined}
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
                        <GroupsPanel
                            theme={theme as 'light' | 'dark'}
                            backgroundColor={bottomRightSectionColor}
                            navigate={navigate}
                            groups={groups}
                            groupsLoading={groupsLoading}
                            textColor={textColor}
                            basePath="club"
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
