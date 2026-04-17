import {
  useState,
  useRef,
  useCallback,
  type ChangeEvent,
  type FormEvent,
  type DragEvent,
} from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Upload,
  FileArchive,
  ChevronRight,
  Calendar,
  Hash,
  CheckCircle2,
  Clock,
  X,
  Replace,
} from 'lucide-react';
import {
  useBundleGroups,
  useUploadBundleFiles,
} from '../../hooks/useBundleGroups';
import { GroupDetailSkeleton } from '../../components/Skeleton';
import { useToastStore } from '../../stores/toastStore';
import { getApiErrorMessage } from '../../utils/apiError';
import styles from './GroupDetailPage.module.css';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function GroupDetailPage() {
  const { version } = useParams<{ version: string }>();
  const { data: groups, isLoading } = useBundleGroups();
  const uploadMutation = useUploadBundleFiles();

  const parsedVersion = Number(version);
  const group =
    Number.isFinite(parsedVersion) && groups
      ? groups.find((g) => g.version === parsedVersion)
      : undefined;

  const [androidFile, setAndroidFile] = useState<File | null>(null);
  const [iosFile, setIosFile] = useState<File | null>(null);
  const [androidDragOver, setAndroidDragOver] = useState(false);
  const [iosDragOver, setIosDragOver] = useState(false);
  const androidInputRef = useRef<HTMLInputElement>(null);
  const iosInputRef = useRef<HTMLInputElement>(null);
  const addLoadingToast = useToastStore((state) => state.addLoadingToast);
  const updateToast = useToastStore((state) => state.updateToast);

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
        if (file && file.name.endsWith('.zip')) {
          setter(file);
        }
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

  const handleUpload = (e: FormEvent) => {
    e.preventDefault();
    if (!group || (!androidFile && !iosFile)) return;

    const formData = new FormData();
    if (androidFile) formData.append('androidBundle', androidFile);
    if (iosFile) formData.append('iosBundle', iosFile);
    const loadingToastId = addLoadingToast('Uploading bundle files...');

    uploadMutation.mutate(
      { id: group._id, formData },
      {
        onSuccess: () => {
          clearFile(setAndroidFile, androidInputRef);
          clearFile(setIosFile, iosInputRef);
          updateToast(loadingToastId, 'Bundle files uploaded.', 'success');
        },
        onError: (error) => {
          updateToast(
            loadingToastId,
            getApiErrorMessage(error, 'Upload failed. Please try again.'),
            'error',
          );
        },
      },
    );
  };

  if (isLoading) return <GroupDetailSkeleton />;
  if (!group) return <p className="empty">Group not found</p>;

  const filesReady = [group.androidBundleUrl, group.iosBundleUrl].filter(
    Boolean,
  ).length;

  return (
    <div className="page">
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link to="/" className={styles.breadcrumbLink}>
          Groups
        </Link>
        <ChevronRight size={14} />
        <span className={styles.breadcrumbCurrent}>{group.name}</span>
      </nav>

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <h2 className={styles.heroTitle}>{group.name}</h2>
          <span
            className={`${styles.statusBadge} ${group.isActive ? styles.statusActive : styles.statusInactive}`}
          >
            <span className={styles.statusDot} />
            {group.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <p className={styles.heroSub}>
          Manage uploaded OTA bundle archives for this version.
        </p>
      </div>

      {/* Stat Cards */}
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <Hash size={16} className={styles.statIconEl} />
          <div>
            <span className={styles.statValue}>{group.version}</span>
            <span className={styles.statLabel}>Bundle Version</span>
          </div>
        </div>
        <div className={styles.stat}>
          <Calendar size={16} className={styles.statIconEl} />
          <div>
            <span className={styles.statValue}>
              {new Date(group.createdAt).toLocaleDateString()}
            </span>
            <span className={styles.statLabel}>Created</span>
          </div>
        </div>
        <div className={styles.stat}>
          <CheckCircle2 size={16} className={styles.statIconEl} />
          <div>
            <span className={styles.statValue}>{filesReady}/2</span>
            <span className={styles.statLabel}>Files Uploaded</span>
          </div>
        </div>
      </div>

      {/* Current Files */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Current Files</h3>
        <div className={styles.filesGrid}>
          <div
            className={`${styles.fileCard} ${group.androidBundleUrl ? styles.fileCardReady : ''}`}
          >
            <div className={styles.fileHead}>
              <span className={styles.platformTag} data-platform="android">
                Android
              </span>
              <FileArchive size={18} />
            </div>
            <span className={styles.fileName}>index.android.bundle.zip</span>
            {group.androidBundleUrl ? (
              <span className={styles.fileReady}>
                <CheckCircle2 size={14} /> Uploaded
              </span>
            ) : (
              <span className={styles.filePending}>
                <Clock size={14} /> Waiting for upload
              </span>
            )}
          </div>
          <div
            className={`${styles.fileCard} ${group.iosBundleUrl ? styles.fileCardReady : ''}`}
          >
            <div className={styles.fileHead}>
              <span className={styles.platformTag} data-platform="ios">
                iOS
              </span>
              <FileArchive size={18} />
            </div>
            <span className={styles.fileName}>main.jsbundle.zip</span>
            {group.iosBundleUrl ? (
              <span className={styles.fileReady}>
                <CheckCircle2 size={14} /> Uploaded
              </span>
            ) : (
              <span className={styles.filePending}>
                <Clock size={14} /> Waiting for upload
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Upload */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          {filesReady === 2 ? 'Replace Files' : 'Upload Files'}
        </h3>
        <p className={styles.sectionDesc}>
          {filesReady === 2
            ? 'Both bundles are uploaded. You can replace them by uploading new files.'
            : 'Select one or both ZIP archives, then upload them in a single request.'}
        </p>
        <form className={styles.uploadForm} onSubmit={handleUpload}>
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
                    Drop .zip here or click to browse
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
                    Drop .zip here or click to browse
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

          <div className={styles.uploadActions}>
            <button
              type="submit"
              className="btn-primary"
              disabled={uploadMutation.isPending || (!androidFile && !iosFile)}
            >
              <Upload size={16} />
              {uploadMutation.isPending
                ? 'Uploading...'
                : filesReady === 2
                  ? 'Replace Files'
                  : 'Upload Files'}
            </button>
            {(androidFile || iosFile) && (
              <span className={styles.uploadSummary}>
                {[androidFile && 'Android', iosFile && 'iOS']
                  .filter(Boolean)
                  .join(' + ')}{' '}
                selected
              </span>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
