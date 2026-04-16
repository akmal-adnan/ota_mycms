import { Link, Outlet, useLocation } from 'react-router-dom';
import { Package, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Layout() {
  const location = useLocation();
  const { email, handleLogout } = useAuth();

  return (
    <div className="layout">
      <header className="app-header">
        <div className="header-left">
          <Package size={22} />
          <h1 className="header-title">OTA Bundle Manager</h1>
        </div>
        <nav className="nav-links">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            <Package size={16} /> Groups
          </Link>
          <Link
            to="/settings"
            className={location.pathname === '/settings' ? 'active' : ''}
          >
            <Settings size={16} /> Settings
          </Link>
        </nav>
        <div className="header-right">
          <span className="user-email">{email}</span>
          <button className="btn-logout" onClick={handleLogout} title="Logout">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
