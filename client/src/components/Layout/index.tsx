import { Link, Outlet, useLocation } from 'react-router-dom';
import { Layers, Settings, LogOut, ChevronDown } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAuth } from '../../hooks/useAuth';
import ToastViewport from '../ToastViewport';
import styles from './Layout.module.css';

export default function Layout() {
  const location = useLocation();
  const { email, handleLogout } = useAuth();
  const isGroupsRoute =
    location.pathname === '/' || location.pathname.startsWith('/groups');
  const isSettingsRoute = location.pathname === '/settings';

  const initials = email ? email.split('@')[0].slice(0, 2).toUpperCase() : '??';

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand}>
            <div className={styles.logoMark}>
              <Layers size={18} />
            </div>
            <span className={styles.brandName}>OTA Manager</span>
          </Link>

          <nav className={styles.nav}>
            <Link
              to="/"
              className={`${styles.navItem} ${isGroupsRoute ? styles.navItemActive : ''}`}
              aria-current={isGroupsRoute ? 'page' : undefined}
            >
              Groups
            </Link>
            <Link
              to="/settings"
              className={`${styles.navItem} ${isSettingsRoute ? styles.navItemActive : ''}`}
              aria-current={isSettingsRoute ? 'page' : undefined}
            >
              Settings
            </Link>
          </nav>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className={styles.userBtn}>
                <span className={styles.avatar}>{initials}</span>
                <span className={styles.userEmail}>{email}</span>
                <ChevronDown size={14} className={styles.chevron} />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className={styles.dropdown}
                sideOffset={8}
                align="end"
              >
                <DropdownMenu.Label className={styles.dropdownLabel}>
                  {email}
                </DropdownMenu.Label>
                <DropdownMenu.Separator className={styles.dropdownSep} />
                <DropdownMenu.Item asChild>
                  <Link to="/settings" className={styles.dropdownItem}>
                    <Settings size={14} />
                    Settings
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className={styles.dropdownSep} />
                <DropdownMenu.Item
                  className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                  onSelect={handleLogout}
                >
                  <LogOut size={14} />
                  Sign out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <ToastViewport />
    </div>
  );
}
