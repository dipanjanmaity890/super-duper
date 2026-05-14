import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage      from './pages/Auth';
import LobbyPage     from './pages/Lobby';
import MatchPage     from './pages/Match';
import AdminPage     from './pages/Admin';
import PointsTable   from './pages/PointsTable';
import ProfilePage   from './pages/Profile';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/auth" replace />;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth"        element={<GuestRoute><AuthPage /></GuestRoute>} />
          <Route path="/"            element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
          <Route path="/match/:id"   element={<ProtectedRoute><MatchPage /></ProtectedRoute>} />
          <Route path="/admin"       element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          <Route path="/points-table" element={<ProtectedRoute><PointsTable /></ProtectedRoute>} />
          <Route path="/profile"     element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="*"            element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
