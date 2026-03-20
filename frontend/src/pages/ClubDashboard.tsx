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
    const navigate = useNavigate();
    const { userId } = useSelector((state: RootState) => state.auth);
    const { profile, status: userStatus } = useSelector((state: RootState) => state.user);
    const theme = useSelector((state: RootState) => state.theme.theme);
    
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

    // Fetch data when user profile is available
    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!userId) return;

            setMembersLoading(true);
            setBlockedStudentsLoading(true);
            setGroupsLoading(true);
            try {
                const [
                    membersRes,
                    blockedStudentsRes,
                    groupsRes
                ] = await Promise.all([
                    getData(`/club/members`),
                    getData(`/club/blocked`),
                    getData(`/club/groups`)
                ]);

                if (membersRes.status) setMembers(membersRes.data);
                if (blockedStudentsRes.status) setBlockedStudents(blockedStudentsRes.data);
                if (groupsRes.status) setGroups(groupsRes.data);

            } catch (error) {
                console.error('Error fetching club dashboard data:', error);
            } finally {
                setMembersLoading(false);
                setBlockedStudentsLoading(false);
                setGroupsLoading(false);
            }
        };

        if (userStatus === 'succeeded' && profile) {
            fetchDashboardData();
        }
    }, [userId, profile, userStatus]);

  

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
                            clubId={userId || undefined}
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
                <h1 className={`text-2xl font-bold mb-4 ${textColor}`}>Could not load Club Dashboard. Please try logging in again.</h1>
            )}
        </div>
    )
}

export default ClubDashboard
