import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

const nav = [
  { to: '/', label: 'Home' },
  { to: '/labour', label: 'Labour' },
  { to: '/stock', label: 'Stock' },
  { to: '/reports', label: 'Reports' },
  { to: '/backup', label: 'Backup' },
];

const titles = {
  '/': 'Dashboard',
  '/labour': 'Labour Management',
  '/stock': 'Stock Management',
  '/reports': 'Reports',
  '/backup': 'Backup & Restore',
  '/admin': 'Admin',
};

export default function AppLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const isAdmin = Number(user?.is_admin) === 1;
  const title = isAdmin
    ? 'Admin'
    : location.pathname.startsWith('/labour/')
      ? 'Labour History'
      : location.pathname.startsWith('/stock/')
        ? 'Stock History'
        : location.pathname.startsWith('/reports/')
          ? 'Report Detail'
        : titles[location.pathname] || 'Construction Manager';
  const visibleNav = isAdmin ? [{ to: '/admin', label: 'Admin' }, { to: '/backup', label: 'Backup' }] : nav;

  return (
    <div className="min-h-screen bg-field text-ink">
      <header className="safe-top sticky top-0 z-10 border-b border-black/10 bg-field/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">Construction Manager</p>
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="mt-1 text-xs font-semibold text-ink/60">User: {user?.name}</p>
            </div>
            <button className="rounded-md bg-white px-3 py-2 text-xs font-bold text-blue-700 shadow-sm" type="button" onClick={logout}>
              Switch
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-4">
        <Outlet />
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-white/95 px-2 pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur">
        <div className={`mx-auto grid max-w-3xl gap-1 ${isAdmin ? 'grid-cols-2' : 'grid-cols-5'}`}>
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex min-h-12 items-center justify-center rounded-md px-1 py-1 text-center text-[12px] font-semibold ${
                  isActive ? 'bg-brand text-white' : 'text-ink/70'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
