
import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useState } from 'react';
import type { RootState } from '../store/store';
import { getData } from '../api/requests';
import { setUserId, setAdminDetails } from '../store/authSlice';
import Header from "../components/Header"

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const authState = useSelector((state: RootState) => state.auth);
  const theme = useSelector((state: RootState) => state.theme.theme);
  const { userId, adminDetails } = authState;
  const [loading, setLoading] = useState(true);

  // Define theme-specific colors
  const backgroundGradient = theme === 'dark' 
    ? 'linear-gradient(180deg, #000000 0%, #0E001B 8%)'
    : 'linear-gradient(180deg, #9435E5 0%, #FFD795 8%)';
    
  const textColor = theme === 'dark' ? 'text-white' : 'text-black';
  
  const headerBackground = theme === 'dark' 
    ? {} // No background for dark theme
    : { background: 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 100%)' };

  // Section colors based on theme
  const leftSectionColor = theme === 'dark' ? '#240046' : '#FFC362';
  const topRightSectionColor = theme === 'dark' ? '#BE190A' : '#FFA162';
  const bottomRightSectionColor = theme === 'dark' ? '#240046' : '#FFC362';

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
            <h1 className={`text-2xl font-bold mt-3 h-[7vh] ${textColor}`}>
              Welcome {adminDetails.username}, {adminDetails.collegeCode}
            </h1>
            
            {/* Three-section layout */}
            <div className='flex-grow flex gap-2 p-3'>
              <div className="left flex-grow rounded-lg p-4" style={{ backgroundColor: leftSectionColor }}>

              </div>
              <div className="right flex-grow flex flex-col gap-2">
                <div className="topRight flex-grow rounded-lg p-4" style={{ backgroundColor: topRightSectionColor }}>

                </div>
                <div className="bottomRight flex-grow rounded-lg p-4" style={{ backgroundColor: bottomRightSectionColor }}>

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
