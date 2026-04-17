import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Trash2,
  ExternalLink,
  Layers,
  Activity,
  Smartphone,
  MoreHorizontal,
  X,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  useBundleGroups,
  useCreateBundleGroup,
  useDeleteBundleGroup,
  useUpdateBundleGroup,
} from '../../hooks/useBundleGroups';
import { DashboardTableSkeleton } from '../../components/Skeleton';
import { getApiErrorMessage } from '../../utils/apiError';
import { useToastStore } from '../../stores/toastStore';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { data: groups, isLoading } = useBundleGroups();
  const createMutation = useCreateBundleGroup();
  const deleteMutation = useDeleteBundleGroup();
  const updateMutation = useUpdateBundleGroup();
  const addLoadingToast = useToastStore((state) => state.addLoadingToast);
  const updateToast = useToastStore((state) => state.updateToast);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');

  const handleCreate = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const loadingToastId = addLoadingToast('Creating bundle group...');

    createMutation.mutate(
      { name, version: parseInt(version, 10) },
      {
        onSuccess: () => {
          setName('');
          setVersion('');
          setShowForm(false);
          updateToast(loadingToastId, 'Bundle group created.', 'success');
        },
        onError: (error) => {
          updateToast(
            loadingToastId,
            getApiErrorMessage(error, 'Failed to create group'),
            'error',
          );
        },
      },
    );
  };

  const handleDelete = (id: string, groupName: string) => {
    if (
      window.confirm(
        `Delete "${groupName}"? This will remove all uploaded files.`,
      )
    ) {
      const loadingToastId = addLoadingToast(`Deleting ${groupName}...`);
      deleteMutation.mutate(id, {
        onSuccess: () => {
          updateToast(loadingToastId, `Deleted ${groupName}.`, 'success');
        },
        onError: (error) => {
          updateToast(
            loadingToastId,
            getApiErrorMessage(error, 'Failed to delete group'),
            'error',
          );
        },
      });
    }
  };

  const handleToggleActive = (id: string, currentActive: boolean) => {
    const nextActive = !currentActive;
    const loadingToastId = addLoadingToast(
      nextActive ? 'Activating group...' : 'Deactivating group...',
    );

    updateMutation.mutate(
      { id, updates: { isActive: nextActive } },
      {
        onSuccess: () => {
          updateToast(
            loadingToastId,
            nextActive ? 'Group activated.' : 'Group deactivated.',
            'success',
          );
        },
        onError: (error) => {
          updateToast(
            loadingToastId,
            getApiErrorMessage(error, 'Failed to update group'),
            'error',
          );
        },
      },
    );
  };

  // Stats
  const totalGroups = groups?.length ?? 0;
  const activeGroups = groups?.filter((g) => g.isActive).length ?? 0;
  const bothPlatforms =
    groups?.filter((g) => g.androidBundleUrl && g.iosBundleUrl).length ?? 0;
  const latestDate = groups?.length
    ? new Date(
        Math.max(...groups.map((g) => new Date(g.createdAt).getTime())),
      ).toLocaleDateString()
    : '—';

  return (
    <div className="page">
      <div className="page-header">
        <h2>Bundle Groups</h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'New Group'}
        </button>
      </div>

      {/* ── Stats Bar ─────────────────────── */}
      {!isLoading && groups && groups.length > 0 && (
        <div className={styles.statsBar}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <Layers size={16} />
            </div>
            <div>
              <span className={styles.statValue}>{totalGroups}</span>
              <span className={styles.statLabel}>Total Groups</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconSuccess}`}>
              <Activity size={16} />
            </div>
            <div>
              <span className={styles.statValue}>{activeGroups}</span>
              <span className={styles.statLabel}>Active</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconInfo}`}>
              <Smartphone size={16} />
            </div>
            <div>
              <span className={styles.statValue}>{bothPlatforms}</span>
              <span className={styles.statLabel}>Both Platforms</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <Plus size={16} />
            </div>
            <div>
              <span className={styles.statValue}>{latestDate}</span>
              <span className={styles.statLabel}>Latest Created</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Form ───────────────────── */}
      {showForm && (
        <form className={styles.createForm} onSubmit={handleCreate}>
          <div className={styles.formRow}>
            <div className="form-group">
              <label htmlFor="groupName">Group Name</label>
              <input
                id="groupName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Release 1.2.0"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="groupVersion">Bundle Version Number</label>
              <input
                id="groupVersion"
                type="number"
                min="1"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. 1"
                required
              />
            </div>
          </div>
          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Group'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Table ─────────────────────────── */}
      {isLoading ? (
        <DashboardTableSkeleton />
      ) : !groups?.length ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Layers size={32} />
          </div>
          <h3>No bundle groups yet</h3>
          <p>Create your first bundle group to get started with OTA updates.</p>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Create First Group
          </button>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Version</th>
                <th>Android</th>
                <th>iOS</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g._id}>
                  <td>
                    <Link
                      to={`/groups/${g.version}`}
                      className={styles.groupName}
                    >
                      {g.name}
                    </Link>
                  </td>
                  <td>
                    <span className={styles.versionBadge}>{g.version}</span>
                  </td>
                  <td>
                    {g.androidBundleUrl ? (
                      <span className={styles.platformUploaded}>
                        <span className={styles.dot} data-color="android" />
                        Uploaded
                      </span>
                    ) : (
                      <span className={styles.platformEmpty}>—</span>
                    )}
                  </td>
                  <td>
                    {g.iosBundleUrl ? (
                      <span className={styles.platformUploaded}>
                        <span className={styles.dot} data-color="ios" />
                        Uploaded
                      </span>
                    ) : (
                      <span className={styles.platformEmpty}>—</span>
                    )}
                  </td>
                  <td>
                    <button
                      className={`${styles.toggle} ${g.isActive ? styles.toggleActive : ''}`}
                      onClick={() => handleToggleActive(g._id, g.isActive)}
                      title={g.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <span className={styles.toggleTrack}>
                        <span className={styles.toggleThumb} />
                      </span>
                      <span className={styles.toggleLabel}>
                        {g.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </button>
                  </td>
                  <td className={styles.dateCell}>
                    {new Date(g.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button className={styles.moreBtn} title="Actions">
                          <MoreHorizontal size={16} />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          className={styles.rowDropdown}
                          sideOffset={4}
                          align="end"
                        >
                          <DropdownMenu.Item asChild>
                            <Link
                              to={`/groups/${g.version}`}
                              className={styles.rowDropdownItem}
                            >
                              <ExternalLink size={14} />
                              View Details
                            </Link>
                          </DropdownMenu.Item>
                          <DropdownMenu.Separator
                            className={styles.rowDropdownSep}
                          />
                          <DropdownMenu.Item
                            className={`${styles.rowDropdownItem} ${styles.rowDropdownDanger}`}
                            onSelect={() => handleDelete(g._id, g.name)}
                          >
                            <Trash2 size={14} />
                            Delete
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
