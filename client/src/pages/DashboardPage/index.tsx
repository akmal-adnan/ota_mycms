import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Trash2,
  FolderOpen,
  X,
  Package,
  Rocket,
  Key,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  useProjects,
  useCreateProject,
  useDeleteProject,
} from '../../hooks/useProjects';
import { DashboardTableSkeleton } from '../../components/Skeleton';
import { getApiErrorMessage } from '../../utils/apiError';
import { useToastStore } from '../../stores/toastStore';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { data: projects, isLoading } = useProjects();
  const createMutation = useCreateProject();
  const deleteMutation = useDeleteProject();
  const addLoadingToast = useToastStore((state) => state.addLoadingToast);
  const updateToast = useToastStore((state) => state.updateToast);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  const toggleKey = (id: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreate = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const loadingToastId = addLoadingToast('Creating project...');
    createMutation.mutate(name, {
      onSuccess: () => {
        setName('');
        setShowForm(false);
        updateToast(loadingToastId, 'Project created.', 'success');
      },
      onError: (error) => {
        updateToast(
          loadingToastId,
          getApiErrorMessage(error, 'Failed to create project'),
          'error',
        );
      },
    });
  };

  const handleDelete = (id: string, projectName: string) => {
    if (
      window.confirm(
        `Delete "${projectName}"? This will permanently remove all bundles and release history.`,
      )
    ) {
      const loadingToastId = addLoadingToast(`Deleting ${projectName}...`);
      deleteMutation.mutate(id, {
        onSuccess: () => {
          updateToast(loadingToastId, `Deleted ${projectName}.`, 'success');
        },
        onError: (error) => {
          updateToast(
            loadingToastId,
            getApiErrorMessage(error, 'Failed to delete project'),
            'error',
          );
        },
      });
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Projects</h2>
          <p className={styles.pageSubtitle}>
            Manage your OTA update projects. Each project has its own bundle
            manager and release history.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'New Project'}
        </button>
      </div>

      {/* ── Create form ───────────────────── */}
      {showForm && (
        <form className={styles.createForm} onSubmit={handleCreate}>
          <div className="form-group">
            <label htmlFor="projectName">Project name</label>
            <input
              id="projectName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Mobile App"
              required
              autoFocus
            />
          </div>
          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Project'}
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

      {/* ── Project list ──────────────────── */}
      {isLoading ? (
        <DashboardTableSkeleton />
      ) : !projects?.length ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <FolderOpen size={32} />
          </div>
          <h3>No projects yet</h3>
          <p>Create your first project to start managing OTA bundle updates.</p>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Create First Project
          </button>
        </div>
      ) : (
        <div className={styles.projectGrid}>
          {projects.map((project) => {
            const keyRevealed = revealedKeys.has(project._id);
            return (
              <div key={project._id} className={styles.projectCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardMeta}>
                    <div className={styles.cardIcon}>
                      <FolderOpen size={18} />
                    </div>
                    <div>
                      <h3 className={styles.cardTitle}>{project.name}</h3>
                      <span className={styles.cardId}>
                        ID: {project._id.slice(-8)}
                      </span>
                    </div>
                  </div>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(project._id, project.name)}
                    aria-label={`Delete ${project.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* API Key row */}
                <div className={styles.apiKeyRow}>
                  <Key size={13} className={styles.apiKeyIcon} />
                  <span className={styles.apiKeyLabel}>Project API Key</span>
                  <code className={styles.apiKeyValue}>
                    {keyRevealed
                      ? project.projectApiKey
                      : `${project.projectApiKey.slice(0, 8)}${'•'.repeat(24)}`}
                  </code>
                  <button
                    className={styles.revealBtn}
                    onClick={() => toggleKey(project._id)}
                    aria-label={keyRevealed ? 'Hide API key' : 'Reveal API key'}
                  >
                    {keyRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>

                {/* Actions */}
                <div className={styles.cardActions}>
                  <Link
                    to={`/projects/${project._id}/bundles`}
                    className={styles.actionBtn}
                  >
                    <Package size={14} />
                    Bundle Manager
                  </Link>
                  <Link
                    to={`/projects/${project._id}/releases`}
                    className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
                  >
                    <Rocket size={14} />
                    Releases
                  </Link>
                </div>

                <p className={styles.cardDate}>
                  Created{' '}
                  {new Date(project.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
