import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PromoterDetails from './pages/PromoterDetails';
import RouteMap from './pages/RouteMap';
import RouteConfig from './pages/RouteConfig';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import StoresManagement from './pages/StoresManagement';
import IndustriesManagement from './pages/IndustriesManagement';
import IndustryCoverage from './pages/IndustryCoverage';
import Admin from './pages/Admin';
import Layout from './components/Layout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>; // TODO: Add proper loading component
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function SupervisorOrAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ADMIN tem acesso a todas as funcionalidades de SUPERVISOR
  if (user.role !== 'SUPERVISOR' && user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard e telas de supervisão: apenas SUPERVISOR e ADMIN */}
        <Route
          index
          element={
            <SupervisorOrAdminRoute>
              <Dashboard />
            </SupervisorOrAdminRoute>
          }
        />
        <Route
          path="promoters/:id"
          element={
            <SupervisorOrAdminRoute>
              <PromoterDetails />
            </SupervisorOrAdminRoute>
          }
        />
        <Route
          path="promoters/:id/route"
          element={
            <SupervisorOrAdminRoute>
              <RouteMap />
            </SupervisorOrAdminRoute>
          }
        />

        {/* Configuração de rotas e gestão de lojas: apenas ADMIN */}
        <Route
          path="routes/config"
          element={
            <AdminRoute>
              <RouteConfig />
            </AdminRoute>
          }
        />
        <Route
          path="stores"
          element={
            <SupervisorOrAdminRoute>
              <StoresManagement />
            </SupervisorOrAdminRoute>
          }
        />

        {/* Telas exclusivas de admin */}
        <Route
          path="industries"
          element={
            <AdminRoute>
              <IndustriesManagement />
            </AdminRoute>
          }
        />
        <Route
          path="industries/coverage"
          element={
            <AdminRoute>
              <IndustryCoverage />
            </AdminRoute>
          }
        />
        <Route
          path="admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />

        {/* Relatórios: SUPERVISOR e ADMIN */}
        <Route
          path="reports"
          element={
            <SupervisorOrAdminRoute>
              <Reports />
            </SupervisorOrAdminRoute>
          }
        />

        {/* Configurações gerais - qualquer usuário autenticado */}
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

