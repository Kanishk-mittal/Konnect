
import { useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import type { RootState } from '../store/store';
import { getData } from '../api/requests';
import Header from "../components/Header"

interface AdminDetails {
  username: string;
  email: string;
  collegeCode: string;
}

const AdminDashboard = () => {
  const authState = useSelector((state: RootState) => state.auth);
  const { userId } = authState;
  const [adminDetails, setAdminDetails] = useState<AdminDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminDetails = async () => {
      console.log('Full auth state:', authState); // Debug log
      console.log('userId from Redux:', userId); // Debug log
      if (userId) {
        try {
          console.log('Fetching admin details for userId:', userId); // Debug log
          const response = await getData(`/admin/details/${userId}`);
          console.log('API response:', response); // Debug log
          if (response.status) {
            setAdminDetails(response.data);
            console.log('Admin details set:', response.data); // Debug log
          } else {
            console.log('API returned false status:', response); // Debug log
          }
        } catch (error) {
          console.error('Error fetching admin details:', error);
        } finally {
          setLoading(false);
        }
      } else {
        console.log('No userId found in Redux state'); // Debug log
        setLoading(false);
      }
    };

    fetchAdminDetails();
  }, [userId]);

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(180deg, #9435E5 0%, #FFD795 8%)'
    }}>
      <div style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 100%)' }}>
        <Header editProfileUrl="/admin/edit-profile" />
      </div>
      <div className="p-4">
        {loading ? (
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        ) : adminDetails ? (
          <div>
            <h1 className="text-2xl font-bold mb-4">
              Welcome {adminDetails.username}, {adminDetails.collegeCode}
            </h1>
            {/* Debug info - remove this later */}
            <div className="text-sm text-gray-600 mt-4">
              <p>Debug - Username: {adminDetails.username}</p>
              <p>Debug - College Code: {adminDetails.collegeCode}</p>
              <p>Debug - Email: {adminDetails.email}</p>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
            {/* Debug info - remove this later */}
            <div className="text-sm text-red-600 mt-4">
              <p>Debug - userId: {userId || 'No userId'}</p>
              <p>Debug - isAuthenticated: {authState.isAuthenticated ? 'true' : 'false'}</p>
              <p>Debug - userType: {authState.userType || 'No userType'}</p>
              <p>Debug - email: {authState.email || 'No email'}</p>
              <p>Debug - adminDetails: {adminDetails ? 'Has data' : 'No data'}</p>
              <p>Debug - loading: {loading ? 'true' : 'false'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
