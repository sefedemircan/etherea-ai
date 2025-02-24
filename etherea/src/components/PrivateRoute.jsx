import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // veya bir yükleme göstergesi
  }

  if (!user) {
    return <Navigate to="/auth/signin" />;
  }

  return children;
} 