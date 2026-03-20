import { useEffect, useState, ReactNode } from 'react';
import { useDispatch } from 'react-redux';
import { setAuthenticated, setUserId, setUserType, setEmail } from '../store/authSlice';
import { getData } from '../api/requests';

const PersistentLogin = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    const verifyUser = async () => {
      try {
        const response = await getData('/user/details');
        if (response?.status) {
          const { userId, userType, email } = response.data;
          dispatch(setUserId(userId));
          dispatch(setUserType(userType));
          dispatch(setEmail(email));
          dispatch(setAuthenticated(true));
        }
      } catch (error) {
        console.error('Session verification failed:', error);
      } finally {
        setLoading(false);
      }
    };

    verifyUser();
  }, [dispatch]);

  if (loading) {
    return <div>Loading...</div>; // You can replace this with a proper spinner component
  }

  return <>{children}</>;
};

export default PersistentLogin;
