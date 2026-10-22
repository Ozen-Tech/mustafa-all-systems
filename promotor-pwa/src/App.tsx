import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useVisitStore } from './stores/visitStore';

import LoginPage from './pages/LoginPage';
import StoresPage from './pages/StoresPage';
import CheckInPage from './pages/CheckInPage';
import ActiveVisitPage from './pages/ActiveVisitPage';
import MissionsPage from './pages/MissionsPage';
import ProfilePage from './pages/ProfilePage';
import BottomNav from './components/BottomNav';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, token, checkAuth } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const verify = async () => {
      if (token && !user) {
        await checkAuth();
      }
      setChecking(false);
    };
    verify();
  }, [token, user, checkAuth]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppLayout() {
  const location = useLocation();
  const { refreshPendingCount } = useVisitStore();

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  // Páginas que não mostram a navegação inferior
  const hideNavPaths = ['/login', '/checkin'];
  const showNav = !hideNavPaths.some(path => location.pathname.startsWith(path));

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <StoresPage />
          </ProtectedRoute>
        } />
        
        <Route path="/checkin/:storeId" element={
          <ProtectedRoute>
            <CheckInPage />
          </ProtectedRoute>
        } />
        
        <Route path="/visita" element={
          <ProtectedRoute>
            <ActiveVisitPage />
          </ProtectedRoute>
        } />
        
        <Route path="/missoes" element={
          <ProtectedRoute>
            <MissionsPage />
          </ProtectedRoute>
        } />
        
        <Route path="/perfil" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {showNav && <BottomNav />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
