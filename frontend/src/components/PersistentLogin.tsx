import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setAuth, setAuthStatus } from '../store/authSlice';
import { fetchUser } from '../store/userSlice';
import { getData } from '../api/requests';
import type { AppDispatch, RootState } from '../store/store';
import type { ReactNode } from 'react';
import { showLoading, hideLoading } from '../store/loadingSlice'; // Import global loading actions

const PersistentLogin = ({ children }: { children: ReactNode }) => {
  const dispatch: AppDispatch = useDispatch();
  const authStatus = useSelector((state: RootState) => state.auth.status);
  const hasRunInitialCheck = useRef(false);

  useEffect(() => {
    const verifyUser = async () => {
      dispatch(setAuthStatus('loading'));
      dispatch(showLoading()); // Show global loading overlay
      try {
        const response = await getData('/user/details');
        if (response?.status && response.data?.userId) {
          const { userId, userType } = response.data;
          dispatch(setAuth({ userId, userType }));
          // After setting auth, fetch the full user profile
          await dispatch(fetchUser());
        } else {
          // If the API call succeeds but indicates no active session
          dispatch(setAuthStatus('failed'));
        }
      } catch (error) {
        dispatch(setAuthStatus('failed'));
      } finally {
        dispatch(hideLoading()); // Hide global loading overlay
      }
    };

    // Only run verification once on initial mount
    if (!hasRunInitialCheck.current) {
      hasRunInitialCheck.current = true;
      verifyUser();
    }
  }, [dispatch]);

  // Once the initial check has started, always render children.
  // The ProtectedRoute and individual pages will handle unauthorized access.
  // The LoadingOverlay handles the visual loading feedback.
  if (!hasRunInitialCheck.current) {
    return null; // Very brief initial null until the effect starts
  }

  return <>{children}</>;
};

export default PersistentLogin;
