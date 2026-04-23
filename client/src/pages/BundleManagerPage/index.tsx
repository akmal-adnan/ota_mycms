import {
  useState,
  useRef,
  useCallback,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Upload,
  FileArchive,
  ChevronRight,
  CheckCircle2,
  X,
  Replace,
  Save,
  Rocket,
  Trash2,
} from 'lucide-react';
import {
  useBundle,
  useCreateBundle,
  useUpdateBundle,
  useUploadBundleFiles,
  useReleaseBundle,
  useDeleteBundle,
} from '../../hooks/useBundles';
import { useProject } from '../../hooks/useProjects';
import { BundleManagerSkeleton } from '../../components/Skeleton';
import { useModal } from '../../components/Modal/useModal';
import { Modal } from '../../components/Modal';
import { getApiErrorMessage } from '../../utils/apiError';
import { useToastStore } from '../../stores/toastStore';
import styles from './BundleManagerPage.module.css';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BundleManagerPage() {
  const { projectId, bundleId } = useParams<{
    projectId: string;
    bundleId: string;
  }>();
  const navigate = useNavigate();
  const isNew = !bundleId || bundleId === 'new';
  const { data: project } = useProject(projectId!);
  const { data: bundle, isLoading } = useBundle(
    projectId!,
    isNew ? '' : bundleId!,
  );

  const createMutation = useCreateBundle(projectId!);
  const updateMutation = useUpdateBundle(projectId!);
  const uploadMutation = useUploadBundleFiles(projectId!);
  const releaseMutation = useReleaseBundle(projectId!);
  const deleteMutation = useDeleteBundle(projectId!);
  const addLoadingToast = useToastStore((s) => s.addLoadingToast);
  const updateToast = useToastStore((s) => s.updateToast);
  const releaseModal = useModal();
  const deleteModal = useModal();

  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetAppVersion, setTargetAppVersion] = useState('');
  const [bundleVersion, setBundleVersion] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Populate form when editing an existing bundle
  if (!isNew && bundle && !initialized) {
    setName(bundle.name);
    setTitle(bundle.title);
    setDescription(bundle.description);
    setTargetAppVersion(bundle.targetAppVersion);
    setBundleVersion(bundle.bundleVersion);
    setInitialized(true);
  }

  // File upload state
  const [androidFile, setAndroidFile] = useState<File | null>(null);
  const [iosFile, setIosFile] = useState<File | null>(null);
  const [androidDragOver, setAndroidDragOver] = useState(false);
  const [iosDragOver, setIosDragOver] = useState(false);
  const androidInputRef = useRef<HTMLInputElement>(null);
  const iosInputRef = useRef<HTMLInputElement>(null);

  const isReleased = bundle?.status === 'released';

  const handleFileChange =
    (setter: (f: File | null) => void) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setter(e.target.files?.[0] ?? null);
    };

  const clearFile = useCallback(
    (
      setter: (f: File | null) => void,
      ref: React.RefObject<HTMLInputElement | null>,
    ) => {
      setter(null);
      if (ref.current) ref.current.value = '';
    },
    [],
  );

  const handleDrop = useCallback(
    (setter: (f: File | null) => void, setDrag: (v: boolean) => void) =>
      (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDrag(false);
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.zip')) setter(file);
      },
    [],
  );

  const handleDragOver = useCallback(
    (setDrag: (v: boolean) => void) => (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDrag(true);
    },
    [],
  );

  const handleDragLeave = useCallback(
    (setDrag: (v: boolean) => void) => (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDrag(false);
    },
    [],
  );

  const handleSaveDraft = async () => {
    const loadingId = addLoadingToast('Saving draft...');
    try {
      let savedBundleId = bundleId;
      if (isNew) {
        const created = await createMutation.mutateAsync({
          name,
          title,
          description,
          targetAppVersion,
          bundleVersion,
        });
        savedBundleId = created._id;
      } else {
        await updateMutation.mutateAsync({
          bundleId: bundleId!,
          payload: {
            name,
            title,
            description,
            targetAppVersion,
            bundleVersion,
          },
        });
      }

      // Upload files if selected
      if ((androidFile || iosFile) && savedBundleId) {
        const formData = new FormData();
        if (androidFile) formData.append('androidBundle', androidFile);
        if (iosFile) formData.append('iosBundle', iosFile);
        await uploadMutation.mutateAsync({
          bundleId: savedBundleId,
          formData,
        });
        clearFile(setAndroidFile, androidInputRef);
        clearFile(setIosFile, iosInputRef);
      }

      updateToast(loadingId, 'Draft saved.', 'success');
      if (isNew && savedBundleId) {
        navigate(`/projects/${projectId}/bundles/${savedBundleId}`, {
          replace: true,
        });
      }
    } catch (err) {
      updateToast(
        loadingId,
        getApiErrorMessage(err, 'Failed to save draft'),
        'error',
      );
    }
  };

  const handleRelease = () => {
    releaseModal.confirm(
      'Once released, core fields become read-only and the bundle will appear on the Releases page.',
      async () => {
        const loadingId = addLoadingToast('Releasing bundle...');
        try {
          let targetId = bundleId;
          if (isNew) {
            const created = await createMutation.mutateAsync({
              name,
              title,
              description,
              targetAppVersion,
              bundleVersion,
            });
            targetId = created._id;
          } else if (!isReleased) {
            await updateMutation.mutateAsync({
              bundleId: bundleId!,
              payload: {
                name,
                title,
                description,
                targetAppVersion,
                bundleVersion,
              },
            });
          }

          if ((androidFile || iosFile) && targetId) {
            const formData = new FormData();
            if (androidFile) formData.append('androidBundle', androidFile);
            if (iosFile) formData.append('iosBundle', iosFile);
            await uploadMutation.mutateAsync({ bundleId: targetId!, formData });
          }

          await releaseMutation.mutateAsync(targetId!);
          updateToast(loadingId, 'Bundle released!', 'success');
          navigate(`/projects/${projectId}/bundles/${targetId}`, {
            replace: true,
          });
        } catch (err) {
          updateToast(
            loadingId,
            getApiErrorMessage(err, 'Failed to release bundle'),
            'error',
          );
        }
      },
      { title: 'Release this bundle?', variant: 'warning' },
    );
  };

  const handleDelete = () => {
    deleteModal.confirm(
      'This will permanently remove this draft bundle and its files.',
      async () => {
        const loadingId = addLoadingToast('Deleting bundle...');
        try {
          await deleteMutation.mutateAsync(bundleId!);
          updateToast(loadingId, 'Bundle deleted.', 'success');
          navigate(`/projects/${projectId}/bundles`, { replace: true });
        } catch (err) {
          updateToast(
            loadingId,
            getApiErrorMessage(err, 'Failed to delete bundle'),
            'error',
          );
        }
      },
      { title: `Delete "${name || 'this bundle'}"?`, variant: 'warning' },
    );
  };

  if (!isNew && isLoading) return <BundleManagerSkeleton />;

  return (
    <>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link
          to={`/projects/${projectId}/bundles`}
          className={styles.breadcrumbLink}
        >
          {project?.name ?? 'Project'}
        </Link>
        <ChevronRight size={14} />
        <Link
          to={`/projects/${projectId}/bundles`}
          className={styles.breadcrumbLink}
        >
          Bundles
        </Link>
        <ChevronRight size={14} />
        <span className={styles.breadcrumbCurrent}>
          {isNew ? 'New Bundle' : (bundle?.name ?? '...')}
        </span>
      </nav>

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <h2 className={styles.heroTitle}>
            {isNew ? 'New Bundle' : (bundle?.name ?? '')}
          </h2>
          {!isNew && bundle && (
            <span
              className={`${styles.statusBadge} ${
                isReleased ? styles.statusReleased : styles.statusDraft
              }`}
            >
              {bundle.status}
            </span>
          )}
        </div>
        <p className={styles.heroSub}>
          {isReleased
            ? 'This bundle has been released. Core fields are read-only.'
            : 'Fill in the bundle details, upload files, then save or release.'}
        </p>
      </div>

      {/* Form */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Bundle Details</h3>
        <div className={styles.formCard}>
          <div className={styles.formGrid}>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Main Bundle"
                required
                readOnly={isReleased}
              />
            </div>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Hotfix release"
              />
            </div>
            <div className="form-group">
              <label>Target App Version</label>
              <input
                type="text"
                value={targetAppVersion}
                onChange={(e) => setTargetAppVersion(e.target.value)}
                placeholder="e.g. 1.0.0"
                required
                readOnly={isReleased}
              />
            </div>
            <div className="form-group">
              <label>Bundle Version</label>
              <input
                type="text"
                value={bundleVersion}
                onChange={(e) => setBundleVersion(e.target.value)}
                placeholder="e.g. 1.0"
                required
                readOnly={isReleased}
              />
            </div>
            <div className={`form-group ${styles.formFull}`}>
              <label>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description of this bundle..."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Upload */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Bundle Files</h3>
        <p className={styles.sectionDesc}>
          Upload Android and iOS ZIP archives.
        </p>
        <div className={styles.uploadForm}>
          <div className={styles.uploadGrid}>
            {/* Android upload zone */}
            <div
              className={`${styles.uploadZone} ${androidFile ? styles.uploadZoneSelected : ''} ${androidDragOver ? styles.uploadZoneDragOver : ''}`}
              onClick={() => !androidFile && androidInputRef.current?.click()}
              onDrop={handleDrop(setAndroidFile, setAndroidDragOver)}
              onDragOver={handleDragOver(setAndroidDragOver)}
              onDragLeave={handleDragLeave(setAndroidDragOver)}
            >
              {androidFile ? (
                <>
                  <CheckCircle2
                    size={24}
                    className={styles.uploadZoneIconReady}
                  />
                  <span className={styles.uploadZoneTitle}>
                    {androidFile.name}
                  </span>
                  <span className={styles.uploadZoneMeta}>
                    {formatFileSize(androidFile.size)}
                  </span>
                  <div className={styles.uploadZoneActions}>
                    <label
                      className={styles.uploadZoneBtnSmall}
                      htmlFor="android-file"
                    >
                      <Replace size={12} /> Replace
                    </label>
                    <button
                      type="button"
                      className={styles.uploadZoneClear}
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFile(setAndroidFile, androidInputRef);
                      }}
                    >
                      <X size={12} /> Remove
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <FileArchive size={24} className={styles.uploadZoneIcon} />
                  <span className={styles.uploadZoneTitle}>Android Bundle</span>
                  <span className={styles.uploadZoneMeta}>
                    {bundle?.androidBundleUrl
                      ? 'Uploaded — drop .zip to replace'
                      : 'Drop .zip here or click to browse'}
                  </span>
                </>
              )}
              <input
                ref={androidInputRef}
                className={styles.hiddenInput}
                id="android-file"
                type="file"
                accept=".zip"
                onChange={handleFileChange(setAndroidFile)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* iOS upload zone */}
            <div
              className={`${styles.uploadZone} ${iosFile ? styles.uploadZoneSelected : ''} ${iosDragOver ? styles.uploadZoneDragOver : ''}`}
              onClick={() => !iosFile && iosInputRef.current?.click()}
              onDrop={handleDrop(setIosFile, setIosDragOver)}
              onDragOver={handleDragOver(setIosDragOver)}
              onDragLeave={handleDragLeave(setIosDragOver)}
            >
              {iosFile ? (
                <>
                  <CheckCircle2
                    size={24}
                    className={styles.uploadZoneIconReady}
                  />
                  <span className={styles.uploadZoneTitle}>{iosFile.name}</span>
                  <span className={styles.uploadZoneMeta}>
                    {formatFileSize(iosFile.size)}
                  </span>
                  <div className={styles.uploadZoneActions}>
                    <label
                      className={styles.uploadZoneBtnSmall}
                      htmlFor="ios-file"
                    >
                      <Replace size={12} /> Replace
                    </label>
                    <button
                      type="button"
                      className={styles.uploadZoneClear}
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFile(setIosFile, iosInputRef);
                      }}
                    >
                      <X size={12} /> Remove
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <FileArchive size={24} className={styles.uploadZoneIcon} />
                  <span className={styles.uploadZoneTitle}>iOS Bundle</span>
                  <span className={styles.uploadZoneMeta}>
                    {bundle?.iosBundleUrl
                      ? 'Uploaded — drop .zip to replace'
                      : 'Drop .zip here or click to browse'}
                  </span>
                </>
              )}
              <input
                ref={iosInputRef}
                className={styles.hiddenInput}
                id="ios-file"
                type="file"
                accept=".zip"
                onChange={handleFileChange(setIosFile)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {(androidFile || iosFile) && (
            <span className={styles.uploadSummary}>
              {[androidFile && 'Android', iosFile && 'iOS']
                .filter(Boolean)
                .join(' + ')}{' '}
              selected
            </span>
          )}
        </div>
      </section>

      {/* Action Bar */}
      <div className={styles.actionBar}>
        {!isReleased && (
          <button
            className="btn-secondary"
            onClick={handleSaveDraft}
            disabled={
              createMutation.isPending ||
              updateMutation.isPending ||
              uploadMutation.isPending
            }
          >
            <Save size={15} /> Save as Draft
          </button>
        )}
        {!isReleased && (
          <button
            className="btn-primary"
            onClick={handleRelease}
            disabled={
              !name ||
              !targetAppVersion ||
              !bundleVersion ||
              releaseMutation.isPending
            }
          >
            <Rocket size={15} /> Release
          </button>
        )}
        {isReleased && (androidFile || iosFile) && (
          <button
            className="btn-primary"
            onClick={handleSaveDraft}
            disabled={uploadMutation.isPending}
          >
            <Upload size={15} /> Upload Files
          </button>
        )}
        {!isNew && !isReleased && (
          <button className="btn-danger" onClick={handleDelete}>
            <Trash2 size={15} /> Delete
          </button>
        )}
      </div>

      {/* Release confirmation modal */}
      <Modal
        isOpen={releaseModal.isOpen}
        onClose={releaseModal.close}
        title={releaseModal.title}
        variant={releaseModal.variant}
        size={releaseModal.size}
        closeButton={releaseModal.closeButton}
        actions={releaseModal.actions}
      >
        {releaseModal.content}
      </Modal>

      {/* Delete confirmation modal */}
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
