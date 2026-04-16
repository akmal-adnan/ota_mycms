import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
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

  return (
    <div className="page">
      <div className="page-header">
        <h2>Bundle Groups</h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> New Group
        </button>
      </div>

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

      {isLoading ? (
        <DashboardTableSkeleton />
      ) : !groups?.length ? (
        <p className="empty">
          No bundle groups yet. Create one to get started.
        </p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.bundleTable}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Bundle Version</th>
                <th>Android</th>
                <th>iOS</th>
                <th>Active</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g._id}>
                  <td>
                    <Link
                      to={`/groups/${g.version}`}
                      className={styles.groupLink}
                    >
                      {g.name}
                    </Link>
                  </td>
                  <td>{g.version}</td>
                  <td>
                    {g.androidBundleUrl ? (
                      <span
                        className={`${styles.badge} ${styles.badgeAndroid}`}
                      >
                        Uploaded
                      </span>
                    ) : (
                      <span className={`${styles.badge} ${styles.badgeEmpty}`}>
                        -
                      </span>
                    )}
                  </td>
                  <td>
                    {g.iosBundleUrl ? (
                      <span className={`${styles.badge} ${styles.badgeIos}`}>
                        Uploaded
                      </span>
                    ) : (
                      <span className={`${styles.badge} ${styles.badgeEmpty}`}>
                        -
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      className={`${styles.toggleBtn} ${g.isActive ? styles.toggleBtnActive : ''}`}
                      onClick={() => handleToggleActive(g._id, g.isActive)}
                      title={g.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <span className={styles.toggleTrack}>
                        <span className={styles.toggleThumb} />
                      </span>
                    </button>
                  </td>
                  <td>{new Date(g.createdAt).toLocaleDateString()}</td>
                  <td className={styles.rowActions}>
                    <Link
                      to={`/groups/${g.version}`}
                      className={styles.actionBtn}
                      title="Details"
                    >
                      <ExternalLink size={14} />
                      Details
                    </Link>
                    <button
                      className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                      onClick={() => handleDelete(g._id, g.name)}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
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
