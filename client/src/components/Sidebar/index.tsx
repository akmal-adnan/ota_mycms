import { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  FolderKanban,
  Package,
  Rocket,
  Key,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useProject } from '../../hooks/useProjects';
import styles from './Sidebar.module.css';

const STORAGE_KEY = 'sidebar-collapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const location = useLocation();
  const params = useParams<{ projectId?: string }>();
  const projectId = params.projectId ?? '';

  const { data: project } = useProject(projectId);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      /* noop */
    }
  }, [collapsed]);

  const isActive = (path: string) => location.pathname === path;
  const startsWith = (prefix: string) => location.pathname.startsWith(prefix);

  return (
    <Tooltip.Provider delayDuration={300} disableHoverableContent>
      <aside
        className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}
      >
        <div className={styles.top}>
          <NavItem
            to="/"
            icon={<FolderKanban size={18} />}
            label="Projects"
            active={isActive('/') || (startsWith('/projects') && !projectId)}
            collapsed={collapsed}
          />
        </div>

        {projectId && (
          <div className={styles.projectSection}>
            {!collapsed && (
              <div className={styles.sectionHeader}>
                <span className={styles.sectionLabel}>
                  {project?.name ?? 'Project'}
                </span>
              </div>
            )}
            {collapsed && <div className={styles.sectionDivider} />}
            <NavItem
              to={`/projects/${projectId}/bundles`}
              icon={<Package size={18} />}
              label="Bundles"
              active={startsWith(`/projects/${projectId}/bundles`)}
              collapsed={collapsed}
            />
            <NavItem
              to={`/projects/${projectId}/releases`}
              icon={<Rocket size={18} />}
              label="Releases"
              active={startsWith(`/projects/${projectId}/releases`)}
              collapsed={collapsed}
            />
            <NavItem
              to={`/projects/${projectId}/api-keys`}
              icon={<Key size={18} />}
              label="API Keys"
              active={isActive(`/projects/${projectId}/api-keys`)}
              collapsed={collapsed}
            />
          </div>
        )}

        <div className={styles.bottom}>
          <NavItem
            to="/settings"
            icon={<Settings size={18} />}
            label="Settings"
            active={isActive('/settings')}
            collapsed={collapsed}
          />
          <button
            className={styles.toggleBtn}
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
      </aside>
    </Tooltip.Provider>
  );
}

function NavItem({
  to,
  icon,
  label,
  active,
  collapsed,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
}) {
  const link = (
    <Link
      to={to}
      className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      <span className={styles.navIcon}>{icon}</span>
      {!collapsed && <span className={styles.navLabel}>{label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className={styles.tooltip}
            side="right"
            sideOffset={8}
          >
            {label}
            <Tooltip.Arrow className={styles.tooltipArrow} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    );
  }

  return link;
}
