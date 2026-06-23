import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import { ToastProvider } from './components/Toast.jsx';
import Dashboard from './pages/Dashboard.jsx';
import LabourDetailPage from './pages/LabourDetailPage.jsx';
import LabourPage from './pages/LabourPage.jsx';
import StockPage from './pages/StockPage.jsx';
import StockDetailPage from './pages/StockDetailPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import ReportDetailPage from './pages/ReportDetailPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import BackupPage from './pages/BackupPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { useDatabaseReady } from './hooks/useDatabaseReady.js';

export default function App() {
  const { ready, error } = useDatabaseReady();

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-field p-6 text-ink">
        <section className="max-w-sm rounded-lg bg-white p-5 shadow-soft">
          <h1 className="text-xl font-semibold">Database error</h1>
          <p className="mt-2 text-sm text-red-700">{error}</p>
        </section>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-field text-ink">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 rounded-full border-4 border-brand border-t-transparent" />
          <p className="mt-4 text-sm font-medium">Loading local database</p>
        </div>
      </main>
    );
  }

  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  const isAdmin = Number(user.is_admin) === 1;

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          {isAdmin ? (
            <>
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/backup" element={<BackupPage />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Dashboard />} />
              <Route path="/labour" element={<LabourPage />} />
              <Route path="/labour/:id" element={<LabourDetailPage />} />
              <Route path="/stock" element={<StockPage />} />
              <Route path="/stock/:id" element={<StockDetailPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/reports/:section" element={<ReportDetailPage />} />
              <Route path="/backup" element={<BackupPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Route>
      </Routes>
    </HashRouter>
  );
}
