import { Link, Outlet, useLocation } from 'react-router-dom';
import { Package, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import ToastViewport from '../ToastViewport';
import styles from './Layout.module.css';

export default function Layout() {
  const location = useLocation();
  const { email, handleLogout } = useAuth();
  const isGroupsRoute = location.pathname === '/';
  const isSettingsRoute = location.pathname === '/settings';

  return (
    <div className={styles.layout}>
      <header className={styles.appHeader}>
        <div className={styles.headerLeft}>
          <Package size={22} />
          <h1 className={styles.headerTitle}>OTA Bundle Manager</h1>
        </div>
        <nav className={styles.navLinks}>
          <Link
            to="/"
            className={`${styles.navLink} ${isGroupsRoute ? styles.active : ''}`}
            aria-current={isGroupsRoute ? 'page' : undefined}
          >
            <Package size={16} /> Groups
          </Link>
          <Link
            to="/settings"
            className={`${styles.navLink} ${isSettingsRoute ? styles.active : ''}`}
            aria-current={isSettingsRoute ? 'page' : undefined}
          >
            <Settings size={16} /> Settings
          </Link>
        </nav>
        <div className={styles.headerRight}>
          <span className={styles.userEmail}>{email}</span>
          <button
            className={styles.btnLogout}
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>
      <main className={styles.appContent}>
        <Outlet />
      </main>
      <ToastViewport />
    </div>
  );
}
