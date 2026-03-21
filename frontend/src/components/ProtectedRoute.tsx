import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import type { RootState } from '../store/store';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedUserTypes: string[]; // e.g., ['admin'], ['club'], ['student']
  redirectPath?: string; // Path to redirect if unauthorized, defaults to '/'
}

const ProtectedRoute = ({ children, allowedUserTypes, redirectPath = '/' }: ProtectedRouteProps) => {
  const { isAuthenticated, userType, userId } = useSelector((state: RootState) => state.auth);

  // If not authenticated at all, redirect
  if (!isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }

  // If authenticated but userId is missing (shouldn't happen if isAuthenticated is true, but as a safeguard)
  if (!userId) {
    return <Navigate to={redirectPath} replace />;
  }

  // Check if the user's type is allowed for this route
  if (!userType || !allowedUserTypes.includes(userType)) {
    // For now, redirect to the general path.
    return <Navigate to={redirectPath} replace />;
  }
  // If authenticated and authorized, render the children
  return <>{children}</>;
};

export default ProtectedRoute;
