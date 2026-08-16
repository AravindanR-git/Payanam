import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';

function RequireAuth({ children }) {
  const { user, loading, authReady } = useAuth();
  const location = useLocation();

  if (loading || !authReady) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default RequireAuth;
