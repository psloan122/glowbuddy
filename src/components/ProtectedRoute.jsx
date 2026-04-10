import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (adminOnly && user?.user_metadata?.user_role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}
