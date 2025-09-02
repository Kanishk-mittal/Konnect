
import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../store/store';
import { getData } from '../api/requests';
import { setUserId, setAdminDetails } from '../store/authSlice';
import Header from "../components/Header"
import SearchBox from "../components/SearchBox"
import StudentTab from "../components/StudentTab"

interface Student {
  id: string;
  rollNumber: string;
  name: string;
  profilePicture: string | null;
  isBlocked: boolean;
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
  const [selectedTab, setSelectedTab] = useState<'Groups' | 'Clubs'>('Groups');

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
        let response;

        if (userId) {
          // If userId is available, use the existing endpoint
          response = await getData(`/admin/details/${userId}`);
        } else {
          // If userId is not available, get admin details from JWT
          response = await getData(`/admin/details`);
        }

        if (response.status) {
          // Store admin details in Redux
          dispatch(setAdminDetails({
            username: response.data.username,
            email: response.data.email,
            collegeCode: response.data.collegeCode
          }));

          // If userId wasn't available but we got it from JWT, store it too
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
        const response = await getData(`/student/details/${adminDetails.collegeCode}`);
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

    fetchStudents();
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
        // If failed, user is not authenticated as admin, show alert and redirect        navigate('/');
      }
    };

    checkAdminAuth();
  }, [navigate, dispatch, authState.userId]);

  return (
    <div className="flex flex-col h-screen" style={{
      background: backgroundGradient
    }}>
      <div style={headerBackground}>
        <Header editProfileUrl="/admin/edit-profile" />
      </div>

      {loading ? (
        <h1 className={`text-2xl font-bold mb-4 ${textColor}`}>Loading...</h1>
      ) : adminDetails ? (
        <div className="flex-grow flex flex-col">
          {/* Three-section layout */}
          <div className='flex-grow flex gap-2 p-3'>
            <div className="left rounded-lg p-4 w-[49%] flex flex-col gap-1" style={{ backgroundColor: leftSectionColor }}>
              <h2 className={`text-xl font-bold mb-4 ${textColor}`}>All Students</h2>
              <SearchBox
                searchText={studentSearchText}
                setSearchText={setStudentSearchText}
                placeholder="Search students..."
              />

              {/* Student List */}
              <div className="flex-grow overflow-y-auto">
                {studentsLoading ? (
                  <div className="text-center py-4">
                    <span className={textColor}>Loading students...</span>
                  </div>
                ) : filteredStudents.length > 0 ? (
                  filteredStudents.map(student => (
                    <StudentTab
                      key={student.id}
                      id={student.id}
                      profilePicture={student.profilePicture}
                      rollNumber={student.rollNumber}
                      name={student.name}
                      isBlocked={student.isBlocked}
                    />
                  ))
                ) : (
                  <div className="text-center py-4">
                    <span className={textColor}>
                      {studentSearchText ? 'No students found matching your search' : 'No student added'}
                    </span>
                  </div>
                )}
              </div>
              <div className="studentControlButtons flex gap-3 mt-4 justify-around">
                <button
                  className="px-6 py-2 rounded-full text-white font-medium hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: '#5A189A' }}
                  onClick={() => navigate('/admin/add-student')}
                >
                  Add Student
                </button>
                <button
                  className="px-6 py-2 rounded-full text-white font-medium hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: '#FF2424' }}
                  onClick={() => console.log('Remove Student clicked')}
                >
                  Remove Student
                </button>
              </div>
            </div>
            <div className="right flex-grow flex flex-col gap-2">
              <div className="topRight flex-grow rounded-lg p-4" style={{ backgroundColor: topRightSectionColor }}>
                <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-[#FFA4A4]' : 'text-[#FF0404]'}`}>Blocked Students</h2>
              </div>
              <div className="bottomRight flex-grow rounded-lg p-4 flex flex-col" style={{ backgroundColor: bottomRightSectionColor }}>
                {/* Sliding Tab Selector */}
                <div className="flex justify-center mb-4">
                  <div className="flex relative rounded-lg p-1 w-[97%] justify-around" style={{
                    backgroundColor: theme === 'dark' ? '#111827' : 'rgba(255,158,0,0.4)'
                  }}>
                    {/* Groups Tab */}
                    <button
                      onClick={() => setSelectedTab('Groups')}
                      className={`px-6 py-2 rounded-md font-medium transition-all duration-300 relative ${selectedTab === 'Groups'
                          ? `${theme === 'dark' ? 'text-white' : 'text-black'} font-bold`
                          : `${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`
                        }`}
                    >
                      Groups
                      {selectedTab === 'Groups' && (
                        <div
                          className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                          style={{
                            backgroundColor: theme === 'dark' ? '#FFA4A4' : '#FF0404'
                          }}
                        />
                      )}
                    </button>

                    {/* Clubs Tab */}
                    <button
                      onClick={() => setSelectedTab('Clubs')}
                      className={`px-6 py-2 rounded-md font-medium transition-all duration-300 relative ${selectedTab === 'Clubs'
                          ? `${theme === 'dark' ? 'text-white' : 'text-black'} font-bold`
                          : `${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`
                        }`}
                    >
                      Clubs
                      {selectedTab === 'Clubs' && (
                        <div
                          className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                          style={{
                            backgroundColor: theme === 'dark' ? '#FFA4A4' : '#FF0404'
                          }}
                        />
                      )}
                    </button>
                  </div>
                </div>

                {/* Content based on selected tab */}
                <div className="flex-grow">
                  {selectedTab === 'Groups' ? (
                    <div className={`text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Groups content will be displayed here
                    </div>
                  ) : (
                    <div className={`text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Clubs content will be displayed here
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <h1 className={`text-2xl font-bold mb-4 ${textColor}`}>Admin Dashboard</h1>
      )}
    </div>
  )
}

export default AdminDashboard
