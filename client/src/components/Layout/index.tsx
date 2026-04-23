import { useState } from 'react';
import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import {
  Layers,
  Settings,
  LogOut,
  ChevronDown,
  FolderOpen,
  Menu,
  X,
  Package,
  Rocket,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAuth } from '../../hooks/useAuth';
import { useProjects } from '../../hooks/useProjects';
import ToastViewport from '../ToastViewport';
import styles from './Layout.module.css';

export default function Layout() {
  const location = useLocation();
  const params = useParams<{ projectId?: string }>();
  const { email, handleLogout } = useAuth();
  const { data: projects } = useProjects();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const initials = email ? email.split('@')[0].slice(0, 2).toUpperCase() : '??';

  const isProjectsRoute = location.pathname === '/';
  const isSettingsRoute = location.pathname === '/settings';
  const activeProjectId = params.projectId;

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className={styles.shell}>
      {/* ── Mobile top bar ────────────────── */}
      <header className={styles.mobileBar}>
        <button
          className={styles.hamburger}
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <Link to="/" className={styles.mobileBrand}>
          <div className={styles.logoMark}>
            <Layers size={16} />
          </div>
          <span className={styles.brandName}>OTA Manager</span>
        </Link>
      </header>

      {/* ── Sidebar overlay (mobile) ──────── */}
      {sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ───────────────────────── */}
      <aside
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}
      >
        <div className={styles.sidebarInner}>
          {/* Brand */}
          <div className={styles.sidebarHeader}>
            <Link to="/" className={styles.brand} onClick={closeSidebar}>
              <div className={styles.logoMark}>
                <Layers size={16} />
              </div>
              <span className={styles.brandName}>OTA Manager</span>
            </Link>
            <button
              className={styles.closeSidebar}
              onClick={closeSidebar}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* Primary nav */}
          <nav className={styles.nav}>
            <span className={styles.navSection}>Navigation</span>
            <Link
              to="/"
              className={`${styles.navItem} ${isProjectsRoute ? styles.navItemActive : ''}`}
              onClick={closeSidebar}
            >
              <FolderOpen size={16} />
              Projects
            </Link>
            <Link
              to="/settings"
              className={`${styles.navItem} ${isSettingsRoute ? styles.navItemActive : ''}`}
              onClick={closeSidebar}
            >
              <Settings size={16} />
              Settings
            </Link>
          </nav>

          {/* Project quick links */}
          {projects && projects.length > 0 && (
            <nav className={styles.nav}>
              <span className={styles.navSection}>Projects</span>
              {projects.map((p) => {
                const isBundlesActive =
                  activeProjectId === p._id &&
                  location.pathname.endsWith('/bundles');
                const isReleasesActive =
                  activeProjectId === p._id &&
                  location.pathname.endsWith('/releases');
                return (
                  <div key={p._id} className={styles.projectGroup}>
                    <span className={styles.projectGroupLabel}>{p.name}</span>
                    <Link
                      to={`/projects/${p._id}/bundles`}
                      className={`${styles.navItemSub} ${isBundlesActive ? styles.navItemActive : ''}`}
                      onClick={closeSidebar}
                    >
                      <Package size={13} />
                      Bundle Manager
                    </Link>
                    <Link
                      to={`/projects/${p._id}/releases`}
                      className={`${styles.navItemSub} ${isReleasesActive ? styles.navItemActive : ''}`}
                      onClick={closeSidebar}
                    >
                      <Rocket size={13} />
                      Releases
                    </Link>
                  </div>
                );
              })}
            </nav>
          )}
        </div>

        {/* User section pinned to bottom */}
        <div className={styles.sidebarFooter}>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className={styles.userBtn}>
                <span className={styles.avatar}>{initials}</span>
                <span className={styles.userEmail}>{email}</span>
                <ChevronDown size={13} className={styles.chevron} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className={styles.dropdown}
                sideOffset={8}
                side="top"
                align="start"
              >
                <DropdownMenu.Label className={styles.dropdownLabel}>
                  {email}
                </DropdownMenu.Label>
                <DropdownMenu.Separator className={styles.dropdownSep} />
                <DropdownMenu.Item asChild>
                  <Link
                    to="/settings"
                    className={styles.dropdownItem}
                    onClick={closeSidebar}
                  >
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
      </aside>

      {/* ── Main content ──────────────────── */}
      <main className={styles.main}>
        <Outlet />
      </main>

      <ToastViewport />
    </div>
  );
}
