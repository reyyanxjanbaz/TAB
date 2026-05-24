import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Welcome from './pages/Welcome';
import Home from './pages/Home';
import GroupDetail from './pages/GroupDetail';
import OrderSetup from './pages/OrderSetup';
import ActiveOrder from './pages/ActiveOrder';
import OrderSummary from './pages/OrderSummary';
import JoinViaLink from './pages/JoinViaLink';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return user ? children : <Navigate to="/welcome" replace />;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50">
      <div className="text-center">
        <div className="w-16 h-16 bg-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-3xl">🍔</span>
        </div>
        <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    </div>
  );

  return (
    <Routes>
      <Route path="/welcome" element={user ? <Navigate to="/" replace /> : <Welcome />} />
      <Route path="/join/:code" element={<JoinViaLink />} />

      <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
      <Route path="/groups/:id" element={<PrivateRoute><GroupDetail /></PrivateRoute>} />
      <Route path="/sessions/:id/setup" element={<PrivateRoute><OrderSetup /></PrivateRoute>} />
      <Route path="/sessions/:id" element={<PrivateRoute><ActiveOrder /></PrivateRoute>} />
      <Route path="/sessions/:id/summary" element={<PrivateRoute><OrderSummary /></PrivateRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
