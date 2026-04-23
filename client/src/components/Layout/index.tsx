import { Link, Outlet } from 'react-router-dom';
import { Layers, Settings, LogOut, ChevronDown } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAuth } from '../../hooks/useAuth';
import Sidebar from '../Sidebar';
import ToastViewport from '../ToastViewport';
import styles from './Layout.module.css';

export default function Layout() {
  const { email, handleLogout } = useAuth();

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

          <div className={styles.headerRight}>
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
        </div>
      </header>

      <div className={styles.body}>
        <Sidebar />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>

      <ToastViewport />
    </div>
  );
}
