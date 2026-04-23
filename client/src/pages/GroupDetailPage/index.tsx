import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronRight,
  FileArchive,
  FolderOpen,
  Plus,
  Rocket,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  useCreateProjectBundle,
  useDeleteProjectBundle,
  useProjectBundles,
  useProjects,
  useReleaseProjectBundle,
  useUpdateProjectBundle,
  useUploadProjectBundleFiles,
} from '../../hooks/useProjects';
import { GroupDetailSkeleton } from '../../components/Skeleton';
import { getApiErrorMessage } from '../../utils/apiError';
import { useToastStore } from '../../stores/toastStore';
import styles from './GroupDetailPage.module.css';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function GroupDetailPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();

  const { data: projects } = useProjects();
  const { data: bundles, isLoading } = useProjectBundles(projectId);

  const createBundleMutation = useCreateProjectBundle(projectId);
  const updateBundleMutation = useUpdateProjectBundle(projectId);
  const deleteBundleMutation = useDeleteProjectBundle(projectId);
  const uploadMutation = useUploadProjectBundleFiles(projectId);
  const releaseMutation = useReleaseProjectBundle(projectId);

  const addLoadingToast = useToastStore((state) => state.addLoadingToast);
  const updateToast = useToastStore((state) => state.updateToast);

  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBundleName, setNewBundleName] = useState('');
  const [newTargetVersion, setNewTargetVersion] = useState('');
  const [bundleDrafts, setBundleDrafts] = useState<
    Record<string, { name: string; targetVersion: string }>
  >({});

  const [androidFile, setAndroidFile] = useState<File | null>(null);
  const [iosFile, setIosFile] = useState<File | null>(null);
  const [androidDragOver, setAndroidDragOver] = useState(false);
  const [iosDragOver, setIosDragOver] = useState(false);

  const androidInputRef = useRef<HTMLInputElement>(null);
  const iosInputRef = useRef<HTMLInputElement>(null);

  const project = projects?.find((p) => p._id === projectId);
  const effectiveSelectedBundleId =
    selectedBundleId ?? bundles?.[0]?._id ?? null;
  const selectedBundle =
    bundles?.find((bundle) => bundle._id === effectiveSelectedBundleId) ?? null;
  const selectedDraft = selectedBundle
    ? (bundleDrafts[selectedBundle._id] ?? {
        name: selectedBundle.name,
        targetVersion: selectedBundle.targetVersion ?? '',
      })
    : null;

  const clearFile = useCallback(
    (
      setter: (file: File | null) => void,
      ref: React.RefObject<HTMLInputElement | null>,
    ) => {
      setter(null);
      if (ref.current) ref.current.value = '';
    },
    [],
  );

  const handleFileChange =
    (setter: (file: File | null) => void) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setter(event.target.files?.[0] ?? null);
    };

  const handleDragOver =
    (setDrag: (value: boolean) => void) =>
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDrag(true);
    };

  const handleDragLeave =
    (setDrag: (value: boolean) => void) =>
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDrag(false);
    };

  const handleDrop =
    (setter: (file: File | null) => void, setDrag: (value: boolean) => void) =>
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDrag(false);
      const file = event.dataTransfer.files?.[0];
      if (file && file.name.endsWith('.zip')) {
        setter(file);
      }
    };

  const handleCreateBundle = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newBundleName.trim()) return;

    const loadingToastId = addLoadingToast('Creating bundle...');
    createBundleMutation.mutate(
      {
        name: newBundleName.trim(),
        targetVersion: newTargetVersion.trim() || undefined,
      },
      {
        onSuccess: (createdBundle) => {
          setNewBundleName('');
          setNewTargetVersion('');
          setShowCreateForm(false);
          setSelectedBundleId(createdBundle._id);
          updateToast(loadingToastId, 'Bundle created.', 'success');
        },
        onError: (error) => {
          updateToast(
            loadingToastId,
            getApiErrorMessage(error, 'Failed to create bundle'),
            'error',
          );
        },
      },
    );
  };

  const handleSaveBundle = () => {
    if (!selectedBundle || !selectedDraft) return;

    const loadingToastId = addLoadingToast('Saving bundle changes...');
    updateBundleMutation.mutate(
      {
        bundleId: selectedBundle._id,
        updates: {
          name: selectedDraft.name.trim(),
          targetVersion: selectedDraft.targetVersion.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          setBundleDrafts((prev) => {
            const next = { ...prev };
            delete next[selectedBundle._id];
            return next;
          });
          updateToast(loadingToastId, 'Bundle saved.', 'success');
        },
        onError: (error) => {
          updateToast(
            loadingToastId,
            getApiErrorMessage(error, 'Failed to save bundle'),
            'error',
          );
        },
      },
    );
  };

  const handleDeleteBundle = () => {
    if (!selectedBundle) return;
    if (!window.confirm(`Delete bundle "${selectedBundle.name}"?`)) return;

    const loadingToastId = addLoadingToast(
      `Deleting ${selectedBundle.name}...`,
    );
    deleteBundleMutation.mutate(selectedBundle._id, {
      onSuccess: () => {
        setSelectedBundleId(null);
        updateToast(loadingToastId, 'Bundle deleted.', 'success');
      },
      onError: (error) => {
        updateToast(
          loadingToastId,
          getApiErrorMessage(error, 'Failed to delete bundle'),
          'error',
        );
      },
    });
  };

  const handleReleaseBundle = () => {
    if (!selectedBundle) return;
    if (!selectedBundle.androidBundleUrl || !selectedBundle.iosBundleUrl)
      return;

    const loadingToastId = addLoadingToast('Releasing bundle...');
    releaseMutation.mutate(selectedBundle._id, {
      onSuccess: () => {
        updateToast(loadingToastId, 'Bundle released.', 'success');
      },
      onError: (error) => {
        updateToast(
          loadingToastId,
          getApiErrorMessage(error, 'Failed to release bundle'),
          'error',
        );
      },
    });
  };

  const handleUpload = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedBundle || (!androidFile && !iosFile)) return;

    const formData = new FormData();
    if (androidFile) formData.append('androidBundle', androidFile);
    if (iosFile) formData.append('iosBundle', iosFile);

    const loadingToastId = addLoadingToast('Uploading files...');
    uploadMutation.mutate(
      {
        bundleId: selectedBundle._id,
        formData,
      },
      {
        onSuccess: () => {
          clearFile(setAndroidFile, androidInputRef);
          clearFile(setIosFile, iosInputRef);
          updateToast(loadingToastId, 'Files uploaded.', 'success');
        },
        onError: (error) => {
          updateToast(
            loadingToastId,
            getApiErrorMessage(error, 'Failed to upload files'),
            'error',
          );
        },
      },
    );
  };

  if (isLoading) return <GroupDetailSkeleton />;

  return (
    <div className="page">
      <nav className={styles.breadcrumb}>
        <Link to="/" className={styles.breadcrumbLink}>
          Projects
        </Link>
        <ChevronRight size={14} />
        <span className={styles.breadcrumbCurrent}>
          {project?.name ?? 'Project'}
        </span>
        <ChevronRight size={14} />
        <span className={styles.breadcrumbCurrent}>Bundle Manager</span>
      </nav>

      <div className="page-header">
        <div>
          <h2>Bundle Manager</h2>
          <p className={styles.subtitle}>
            Create and manage bundles for {project?.name ?? 'this project'}.
          </p>
        </div>
        <button
          className="btn-secondary"
          type="button"
          onClick={() => setShowCreateForm((prev) => !prev)}
        >
          {showCreateForm ? <X size={15} /> : <Plus size={15} />}
          {showCreateForm ? 'Close Form' : 'Create Bundle'}
        </button>
      </div>

      {showCreateForm && (
        <form className={styles.createForm} onSubmit={handleCreateBundle}>
          <div className={styles.createGrid}>
            <div className="form-group">
              <label htmlFor="bundleName">Bundle name</label>
              <input
                id="bundleName"
                type="text"
                value={newBundleName}
                onChange={(event) => setNewBundleName(event.target.value)}
                placeholder="e.g. Production Bundle"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="targetVersion">Target version</label>
              <input
                id="targetVersion"
                type="text"
                value={newTargetVersion}
                onChange={(event) => setNewTargetVersion(event.target.value)}
                placeholder="e.g. 1.5.x"
              />
            </div>
          </div>
          <div className="form-actions">
            <button
              className="btn-primary"
              type="submit"
              disabled={createBundleMutation.isPending}
            >
              {createBundleMutation.isPending ? 'Creating...' : 'Save Bundle'}
            </button>
          </div>
        </form>
      )}

      {!bundles?.length ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <FolderOpen size={30} />
          </div>
          <h3>No bundles yet</h3>
          <p>
            Create the first bundle to upload OTA packages and publish releases.
          </p>
          <button
            className="btn-primary"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus size={15} /> Create First Bundle
          </button>
        </div>
      ) : (
        <div className={styles.layoutGrid}>
          <section className={styles.bundleListPanel}>
            <h3>Bundles</h3>
            <div className={styles.bundleList}>
              {bundles.map((bundle) => (
                <button
                  key={bundle._id}
                  type="button"
                  className={`${styles.bundleRow} ${effectiveSelectedBundleId === bundle._id ? styles.bundleRowActive : ''}`}
                  onClick={() => setSelectedBundleId(bundle._id)}
                >
                  <div>
                    <strong>{bundle.name}</strong>
                    <span>
                      v{bundle.version} •{' '}
                      {bundle.targetVersion || 'No target version'}
                    </span>
                  </div>
                  {bundle.isReleased ? (
                    <span className={styles.releasedBadge}>Released</span>
                  ) : (
                    <span className={styles.draftBadge}>Draft</span>
                  )}
                </button>
              ))}
            </div>
          </section>

          {selectedBundle && (
            <section className={styles.detailPanel}>
              <div className={styles.detailHeader}>
                <h3>{selectedBundle.name}</h3>
                <p>Manage package files, target version, and release status.</p>
              </div>

              <div className={styles.editGrid}>
                <div className="form-group">
                  <label htmlFor="editBundleName">Bundle name</label>
                  <input
                    id="editBundleName"
                    type="text"
                    value={selectedDraft?.name ?? ''}
                    onChange={(event) => {
                      if (!selectedBundle) return;
                      setBundleDrafts((prev) => ({
                        ...prev,
                        [selectedBundle._id]: {
                          name: event.target.value,
                          targetVersion:
                            prev[selectedBundle._id]?.targetVersion ??
                            selectedBundle.targetVersion ??
                            '',
                        },
                      }));
                    }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="editTargetVersion">Target version</label>
                  <input
                    id="editTargetVersion"
                    type="text"
                    value={selectedDraft?.targetVersion ?? ''}
                    onChange={(event) => {
                      if (!selectedBundle) return;
                      setBundleDrafts((prev) => ({
                        ...prev,
                        [selectedBundle._id]: {
                          name:
                            prev[selectedBundle._id]?.name ??
                            selectedBundle.name,
                          targetVersion: event.target.value,
                        },
                      }));
                    }}
                    placeholder="e.g. 1.5.x"
                  />
                </div>
              </div>

              <div className={styles.currentFiles}>
                <div className={styles.fileStatusItem}>
                  <span>Android</span>
                  {selectedBundle.androidBundleUrl ? (
                    <span className={styles.readyStatus}>
                      <CheckCircle2 size={14} /> Uploaded
                    </span>
                  ) : (
                    <span className={styles.pendingStatus}>Missing</span>
                  )}
                </div>
                <div className={styles.fileStatusItem}>
                  <span>iOS</span>
                  {selectedBundle.iosBundleUrl ? (
                    <span className={styles.readyStatus}>
                      <CheckCircle2 size={14} /> Uploaded
                    </span>
                  ) : (
                    <span className={styles.pendingStatus}>Missing</span>
                  )}
                </div>
              </div>

              <form className={styles.uploadForm} onSubmit={handleUpload}>
                <div className={styles.uploadGrid}>
                  <div
                    className={`${styles.uploadZone} ${androidDragOver ? styles.uploadZoneDragOver : ''} ${androidFile ? styles.uploadZoneSelected : ''}`}
                    onDrop={handleDrop(setAndroidFile, setAndroidDragOver)}
                    onDragOver={handleDragOver(setAndroidDragOver)}
                    onDragLeave={handleDragLeave(setAndroidDragOver)}
                    onClick={() => androidInputRef.current?.click()}
                  >
                    <FileArchive size={18} />
                    <strong>Android bundle (.zip)</strong>
                    <span>
                      {androidFile
                        ? `${androidFile.name} (${formatFileSize(androidFile.size)})`
                        : 'Drop file or click to select'}
                    </span>
                    <input
                      ref={androidInputRef}
                      type="file"
                      accept=".zip"
                      className={styles.hiddenInput}
                      onChange={handleFileChange(setAndroidFile)}
                    />
                  </div>

                  <div
                    className={`${styles.uploadZone} ${iosDragOver ? styles.uploadZoneDragOver : ''} ${iosFile ? styles.uploadZoneSelected : ''}`}
                    onDrop={handleDrop(setIosFile, setIosDragOver)}
                    onDragOver={handleDragOver(setIosDragOver)}
                    onDragLeave={handleDragLeave(setIosDragOver)}
                    onClick={() => iosInputRef.current?.click()}
                  >
                    <FileArchive size={18} />
                    <strong>iOS bundle (.zip)</strong>
                    <span>
                      {iosFile
                        ? `${iosFile.name} (${formatFileSize(iosFile.size)})`
                        : 'Drop file or click to select'}
                    </span>
                    <input
                      ref={iosInputRef}
                      type="file"
                      accept=".zip"
                      className={styles.hiddenInput}
                      onChange={handleFileChange(setIosFile)}
                    />
                  </div>
                </div>

                <div className={styles.uploadActions}>
                  <button
                    type="submit"
                    className="btn-secondary"
                    disabled={
                      uploadMutation.isPending || (!androidFile && !iosFile)
                    }
                  >
                    <Upload size={15} />
                    {uploadMutation.isPending ? 'Uploading...' : 'Upload Files'}
                  </button>

                  {(androidFile || iosFile) && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        clearFile(setAndroidFile, androidInputRef);
                        clearFile(setIosFile, iosInputRef);
                      }}
                    >
                      <X size={14} /> Clear Selection
                    </button>
                  )}
                </div>
              </form>

              <div className={styles.actionRow}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSaveBundle}
                  disabled={
                    updateBundleMutation.isPending ||
                    !selectedDraft?.name.trim()
                  }
                >
                  <Save size={15} />
                  {updateBundleMutation.isPending ? 'Saving...' : 'Save'}
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleReleaseBundle}
                  disabled={
                    releaseMutation.isPending ||
                    !selectedBundle.androidBundleUrl ||
                    !selectedBundle.iosBundleUrl ||
                    selectedBundle.isReleased
                  }
                >
                  <Rocket size={15} />
                  {selectedBundle.isReleased
                    ? 'Released'
                    : releaseMutation.isPending
                      ? 'Releasing...'
                      : 'Release'}
                </button>

                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={handleDeleteBundle}
                  disabled={deleteBundleMutation.isPending}
                >
                  <Trash2 size={15} />
                  Delete
                </button>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
