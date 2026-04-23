import { useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Package,
  Trash2,
  ExternalLink,
  MoreHorizontal,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useBundles, useDeleteBundle } from '../../hooks/useBundles';
import { useToggleReleaseBundle } from '../../hooks/useReleases';
import { BundleListSkeleton } from '../../components/Skeleton';
import { useModal } from '../../components/Modal/useModal';
import { Modal } from '../../components/Modal';
import { getApiErrorMessage } from '../../utils/apiError';
import { useToastStore } from '../../stores/toastStore';
import styles from './BundleListPage.module.css';

export default function BundleListPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: bundles, isLoading } = useBundles(projectId!);
  const deleteMutation = useDeleteBundle(projectId!);
  const toggleMutation = useToggleReleaseBundle(projectId!);
  const addLoadingToast = useToastStore((s) => s.addLoadingToast);
  const updateToast = useToastStore((s) => s.updateToast);
  const deleteModal = useModal();
  const pendingRef = useRef({ id: '', name: '' });

  const confirmDelete = (id: string, name: string) => {
    pendingRef.current = { id, name };
    deleteModal.confirm(
      'This will permanently remove this draft bundle.',
      () => {
        const loadingId = addLoadingToast(`Deleting ${name}...`);
        deleteMutation.mutate(id, {
          onSuccess: () =>
            updateToast(loadingId, `Deleted ${name}.`, 'success'),
          onError: (err) =>
            updateToast(
              loadingId,
              getApiErrorMessage(err, 'Failed to delete bundle'),
              'error',
            ),
        });
      },
      { title: `Delete "${name}"?`, variant: 'warning' },
    );
  };

  const handleToggle = (bundleId: string, currentActive: boolean) => {
    toggleMutation.mutate({ bundleId, isActive: !currentActive });
  };

  if (isLoading) return <BundleListSkeleton />;

  return (
    <>
      <div className="page-header">
        <h2>Bundles</h2>
        <Link to={`/projects/${projectId}/bundles/new`} className="btn-primary">
          <Plus size={15} /> New Bundle
        </Link>
      </div>

      {bundles && bundles.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Package size={26} />
          </div>
          <h3>No bundles yet</h3>
          <p>Create your first bundle to start managing OTA updates.</p>
          <Link
            to={`/projects/${projectId}/bundles/new`}
            className="btn-primary"
          >
            <Plus size={15} /> New Bundle
          </Link>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Bundle Ver.</th>
                <th>Target App Ver.</th>
                <th>Status</th>
                <th>Active</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {bundles?.map((bundle) => (
                <tr
                  key={bundle._id}
                  onClick={() =>
                    navigate(`/projects/${projectId}/bundles/${bundle._id}`)
                  }
                >
                  <td>
                    <Link
                      to={`/projects/${projectId}/bundles/${bundle._id}`}
                      className={styles.bundleName}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {bundle.name}
                    </Link>
                  </td>
                  <td>
                    <span className={styles.versionBadge}>
                      {bundle.bundleVersion}
                    </span>
                  </td>
                  <td>
                    <span className={styles.versionBadge}>
                      {bundle.targetAppVersion}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        bundle.status === 'released'
                          ? styles.statusReleased
                          : styles.statusDraft
                      }`}
                    >
                      {bundle.status}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {bundle.status === 'released' ? (
                      <button
                        className={`${styles.toggle} ${bundle.isActive ? styles.toggleActive : ''}`}
                        onClick={() =>
                          handleToggle(bundle._id, bundle.isActive)
                        }
                      >
                        <span className={styles.toggleTrack}>
                          <span className={styles.toggleThumb} />
                        </span>
                      </button>
                    ) : (
                      <span className={styles.dateCell}>—</span>
                    )}
                  </td>
                  <td className={styles.dateCell}>
                    {new Date(bundle.createdAt).toLocaleDateString()}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button className={styles.moreBtn}>
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
                              to={`/projects/${projectId}/bundles/${bundle._id}`}
                              className={styles.rowDropdownItem}
                            >
                              <ExternalLink size={14} />
                              Edit
                            </Link>
                          </DropdownMenu.Item>
                          {bundle.status === 'draft' && (
                            <>
                              <DropdownMenu.Separator
                                className={styles.rowDropdownSep}
                              />
                              <DropdownMenu.Item
                                className={`${styles.rowDropdownItem} ${styles.rowDropdownDanger}`}
                                onSelect={() =>
                                  confirmDelete(bundle._id, bundle.name)
                                }
                              >
                                <Trash2 size={14} />
                                Delete
                              </DropdownMenu.Item>
                            </>
                          )}
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

      <Modal
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        title={deleteModal.title}
        variant={deleteModal.variant}
        size={deleteModal.size}
        closeButton={deleteModal.closeButton}
        actions={deleteModal.actions}
      >
        {deleteModal.content}
      </Modal>
    </>
  );
}
