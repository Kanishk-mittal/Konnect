import { useEffect, useState, ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setAuth, clearAuth, setAuthStatus } from '../store/authSlice';
import { fetchUser } from '../store/userSlice';
import { getData } from '../api/requests';
import type { AppDispatch, RootState } from '../store/store';

const PersistentLogin = ({ children }: { children: ReactNode }) => {
  const dispatch: AppDispatch = useDispatch();
  const authStatus = useSelector((state: RootState) => state.auth.status);

  useEffect(() => {
    const verifyUser = async () => {
      dispatch(setAuthStatus('loading'));
      try {
        const response = await getData('/user/details');
        if (response?.status && response.data?.userId) {
          const { userId, userType } = response.data;
          dispatch(setAuth({ userId, userType }));
          // After setting auth, fetch the full user profile
          dispatch(fetchUser());
        } else {
          // If the API call succeeds but indicates no active session
          dispatch(setAuthStatus('failed'));
        }
      } catch (error) {
        // If the API call fails (e.g., 401 Unauthorized)
        console.error('Session verification failed:', error);
        dispatch(setAuthStatus('failed'));
      }
    };

    // Only run verification if the auth status is idle (initial load)
    if (authStatus === 'idle') {
        verifyUser();
    }
  }, [dispatch, authStatus]);

  // Show loading indicator while session is being verified
  if (authStatus === 'loading' || authStatus === 'idle') {
    return <div>Loading...</div>; // Or a proper spinner component
  }

  return <>{children}</>;
};

export default PersistentLogin;
