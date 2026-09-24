import type { ComponentType } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfirmProvider } from './hooks/useConfirm';
import AppToaster from './components/ui/Toaster';
import PageLoading from './components/ui/PageLoading';

// Type assertion for React 18 + react-router-dom JSX compatibility
const RouterRoutes = Routes as ComponentType<{ children?: React.ReactNode }>;
const RouterRoute = Route as ComponentType<Record<string, unknown>>;
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OpsTeamToday from './pages/OpsTeamToday';
import OpsTradeMetrics from './pages/OpsTradeMetrics';
import OpsIndustryAudit from './pages/OpsIndustryAudit';
import OpsIndustryGallery from './pages/OpsIndustryGallery';
import OpsPromoterDayDetail from './pages/OpsPromoterDayDetail';
import PromoterDetails from './pages/PromoterDetails';
import RouteMap from './pages/RouteMap';
import RouteConfig from './pages/RouteConfig';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import StoresManagement from './pages/StoresManagement';
import IndustriesManagement from './pages/IndustriesManagement';
import IndustryCoverage from './pages/IndustryCoverage';
import StoreIndustriesConfig from './pages/StoreIndustriesConfig';
import IndustryOwnerDashboard from './pages/IndustryOwnerDashboard';
import Admin from './pages/Admin';
import StockImport from './pages/StockImport';
import StockDashboard from './pages/StockDashboard';
import InformationHub from './pages/InformationHub';
import PromoterOpsSupport from './pages/PromoterOpsSupport';
import AdminTodayPromoterOverview from './pages/AdminTodayPromoterOverview';
import AppStoreReleaseOps from './pages/AppStoreReleaseOps';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ChainsManagement from './pages/ChainsManagement';
import OrdersList from './pages/OrdersList';
import OrdersImport from './pages/OrdersImport';
import GoalsPage from './pages/GoalsPage';
import OwnerDashboard from './pages/OwnerDashboard';
import FeedPage from './pages/FeedPage';
import Layout from './components/Layout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoading />;
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
    return <PageLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'SUPERVISOR' && user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function IndustryOwnerRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'INDUSTRY_OWNER' && user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <RouterRoutes>
      <RouterRoute path="/login" element={<Login />} />
      {/* Público: URL da política de privacidade para Play Console / App Store */}
      <RouterRoute path="/privacy" element={<PrivacyPolicy />} />
      <RouterRoute path="/privacy-policy" element={<PrivacyPolicy />} />
      <RouterRoute
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard e telas de supervisão: apenas SUPERVISOR e ADMIN */}
        <RouterRoute
          index
          element={
            <SupervisorOrAdminRoute>
              <OpsTeamToday />
            </SupervisorOrAdminRoute>
          }
        />
        <RouterRoute
          path="ops/team-today"
          element={
            <SupervisorOrAdminRoute>
              <OpsTeamToday />
            </SupervisorOrAdminRoute>
          }
        />
        <RouterRoute
          path="ops/trade-metrics"
          element={
            <SupervisorOrAdminRoute>
              <OpsTradeMetrics />
            </SupervisorOrAdminRoute>
          }
        />
        <RouterRoute
          path="ops/industry-audit"
          element={
            <SupervisorOrAdminRoute>
              <OpsIndustryAudit />
            </SupervisorOrAdminRoute>
          }
        />
        <RouterRoute
          path="ops/industry-gallery"
          element={
            <SupervisorOrAdminRoute>
              <OpsIndustryGallery />
            </SupervisorOrAdminRoute>
          }
        />
        <RouterRoute
          path="ops/promoters/:promoterId/day"
          element={
            <SupervisorOrAdminRoute>
              <OpsPromoterDayDetail />
            </SupervisorOrAdminRoute>
          }
        />
        <RouterRoute
          path="dashboard-legacy"
          element={
            <SupervisorOrAdminRoute>
              <Dashboard />
            </SupervisorOrAdminRoute>
          }
        />
        <RouterRoute
          path="promoters/:id"
          element={
            <SupervisorOrAdminRoute>
              <PromoterDetails />
            </SupervisorOrAdminRoute>
          }
        />
        <RouterRoute
          path="promoters/:id/route"
          element={
            <SupervisorOrAdminRoute>
              <RouteMap />
            </SupervisorOrAdminRoute>
          }
        />

        {/* Configuração de rotas: supervisor (escopo) ou admin */}
        <RouterRoute
          path="routes/config"
          element={
            <SupervisorOrAdminRoute>
              <RouteConfig />
            </SupervisorOrAdminRoute>
          }
        />
        <RouterRoute
          path="stores"
          element={
            <SupervisorOrAdminRoute>
              <StoresManagement />
            </SupervisorOrAdminRoute>
          }
        />

        {/* Telas exclusivas de admin */}
        <RouterRoute
          path="industries"
          element={
            <AdminRoute>
              <IndustriesManagement />
            </AdminRoute>
          }
        />
        <RouterRoute
          path="industries/coverage"
          element={
            <AdminRoute>
              <IndustryCoverage />
            </AdminRoute>
          }
        />
        <RouterRoute
          path="stores/industries"
          element={
            <AdminRoute>
              <StoreIndustriesConfig />
            </AdminRoute>
          }
        />
        <RouterRoute
          path="admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />
        <RouterRoute
          path="admin/promoter-correcoes"
          element={
            <AdminRoute>
              <PromoterOpsSupport />
            </AdminRoute>
          }
        />
        <RouterRoute
          path="admin/promoters/today"
          element={
            <AdminRoute>
              <AdminTodayPromoterOverview />
            </AdminRoute>
          }
        />

        {/* Rota oculta: publicação app mobile (lojas) — só ADMIN, fora do menu */}
        <RouterRoute
          path="internal/pg-mobile-stores"
          element={
            <AdminRoute>
              <AppStoreReleaseOps />
            </AdminRoute>
          }
        />

        {/* Relatórios: SUPERVISOR e ADMIN */}
        <RouterRoute
          path="reports"
          element={
            <SupervisorOrAdminRoute>
              <Reports />
            </SupervisorOrAdminRoute>
          }
        />

        {/* Comercial: pedidos, metas, redes, painel e feed */}
        <RouterRoute
          path="painel"
          element={
            <SupervisorOrAdminRoute>
              <OwnerDashboard />
            </SupervisorOrAdminRoute>
          }
        />
        <RouterRoute
          path="pedidos"
          element={
            <SupervisorOrAdminRoute>
              <OrdersList />
            </SupervisorOrAdminRoute>
          }
        />
        <RouterRoute
          path="pedidos/import"
          element={
            <AdminRoute>
              <OrdersImport />
            </AdminRoute>
          }
        />
        <RouterRoute
          path="metas"
          element={
            <SupervisorOrAdminRoute>
              <GoalsPage />
            </SupervisorOrAdminRoute>
          }
        />
        <RouterRoute
          path="redes"
          element={
            <AdminRoute>
              <ChainsManagement />
            </AdminRoute>
          }
        />
        <RouterRoute
          path="feed"
          element={
            <SupervisorOrAdminRoute>
              <FeedPage />
            </SupervisorOrAdminRoute>
          }
        />

        {/* Estoque e Vendas */}
        <RouterRoute
          path="stock"
          element={
            <SupervisorOrAdminRoute>
              <StockDashboard />
            </SupervisorOrAdminRoute>
          }
        />
        <RouterRoute
          path="stock/import"
          element={
            <AdminRoute>
              <StockImport />
            </AdminRoute>
          }
        />
        <RouterRoute
          path="information"
          element={
            <AdminRoute>
              <InformationHub />
            </AdminRoute>
          }
        />

        {/* Dashboard do Dono de Indústria */}
        <RouterRoute
          path="industry-dashboard"
          element={
            <IndustryOwnerRoute>
              <IndustryOwnerDashboard />
            </IndustryOwnerRoute>
          }
        />

        {/* Configurações gerais - qualquer usuário autenticado */}
        <RouterRoute path="settings" element={<Settings />} />
      </RouterRoute>
    </RouterRoutes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <AppToaster />
        <AppRoutes />
      </ConfirmProvider>
    </AuthProvider>
  );
}

