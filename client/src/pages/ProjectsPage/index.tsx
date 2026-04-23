import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Trash2,
  ExternalLink,
  FolderKanban,
  MoreHorizontal,
  X,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  useProjects,
  useCreateProject,
  useDeleteProject,
} from '../../hooks/useProjects';
import { ProjectsPageSkeleton } from '../../components/Skeleton';
import { useModal } from '../../components/Modal/useModal';
import { Modal } from '../../components/Modal';
import { getApiErrorMessage } from '../../utils/apiError';
import { useToastStore } from '../../stores/toastStore';
import styles from './ProjectsPage.module.css';

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();
  const createMutation = useCreateProject();
  const deleteMutation = useDeleteProject();
  const addLoadingToast = useToastStore((s) => s.addLoadingToast);
  const updateToast = useToastStore((s) => s.updateToast);
  const deleteModal = useModal();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');

  const handleCreate = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const loadingId = addLoadingToast('Creating project...');
    createMutation.mutate(name, {
      onSuccess: () => {
        setName('');
        setShowForm(false);
        updateToast(loadingId, 'Project created.', 'success');
      },
      onError: (err) => {
        updateToast(
          loadingId,
          getApiErrorMessage(err, 'Failed to create project'),
          'error',
        );
      },
    });
  };

  const confirmDelete = (id: string, projectName: string) => {
    deleteModal.confirm(
      'This will permanently remove the project, all its bundles, and API keys.',
      () => {
        const loadingId = addLoadingToast(`Deleting ${projectName}...`);
        deleteMutation.mutate(id, {
          onSuccess: () =>
            updateToast(loadingId, `Deleted ${projectName}.`, 'success'),
          onError: (err) =>
            updateToast(
              loadingId,
              getApiErrorMessage(err, 'Failed to delete project'),
              'error',
            ),
        });
      },
      { title: `Delete "${projectName}"?`, variant: 'warning' },
    );
  };

  if (isLoading) return <ProjectsPageSkeleton />;

  return (
    <>
      <div className="page-header">
        <h2>Projects</h2>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? (
            <>
              <X size={15} /> Cancel
            </>
          ) : (
            <>
              <Plus size={15} /> New Project
            </>
          )}
        </button>
      </div>

      {showForm && (
        <form className={styles.createForm} onSubmit={handleCreate}>
          <div className="form-group">
            <label>Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My App"
              required
            />
          </div>
          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={createMutation.isPending}
            >
              <Plus size={15} />
              {createMutation.isPending ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      )}

      {projects && projects.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <FolderKanban size={26} />
          </div>
          <h3>No projects yet</h3>
          <p>Create your first project to start managing OTA bundles.</p>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={15} /> New Project
          </button>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>API Keys</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {projects?.map((project) => (
                <tr key={project._id}>
                  <td>
                    <Link
                      to={`/projects/${project._id}/bundles`}
                      className={styles.projectName}
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td>
                    <span className={styles.keyCount}>
                      {/* {project.apiKeys.length} */}
                    </span>
                  </td>
                  <td className={styles.dateCell}>
                    {new Date(project.createdAt).toLocaleDateString()}
                  </td>
                  <td>
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
                              to={`/projects/${project._id}/bundles`}
                              className={styles.rowDropdownItem}
                            >
                              <ExternalLink size={14} />
                              Open
                            </Link>
                          </DropdownMenu.Item>
                          <DropdownMenu.Separator
                            className={styles.rowDropdownSep}
                          />
                          <DropdownMenu.Item
                            className={`${styles.rowDropdownItem} ${styles.rowDropdownDanger}`}
                            onSelect={() =>
                              confirmDelete(project._id, project.name)
                            }
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
