import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileArchive } from 'lucide-react';
import {
  useBundleGroups,
  useUploadBundleFiles,
} from '../../hooks/useBundleGroups';
import { GroupDetailSkeleton } from '../../components/Skeleton';
import { useToastStore } from '../../stores/toastStore';
import { getApiErrorMessage } from '../../utils/apiError';
import styles from './GroupDetailPage.module.css';

export default function GroupDetailPage() {
  const { version } = useParams<{ version: string }>();
  const navigate = useNavigate();
  const { data: groups, isLoading } = useBundleGroups();
  const uploadMutation = useUploadBundleFiles();

  const parsedVersion = Number(version);
  const group =
    Number.isFinite(parsedVersion) && groups
      ? groups.find((g) => g.version === parsedVersion)
      : undefined;

  const [androidFile, setAndroidFile] = useState<File | null>(null);
  const [iosFile, setIosFile] = useState<File | null>(null);
  const addLoadingToast = useToastStore((state) => state.addLoadingToast);
  const updateToast = useToastStore((state) => state.updateToast);

  const handleFileChange =
    (setter: (f: File | null) => void) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setter(e.target.files?.[0] ?? null);
    };

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
          setAndroidFile(null);
          setIosFile(null);
          const inputs =
            document.querySelectorAll<HTMLInputElement>('input[type="file"]');
          inputs.forEach((el) => {
            el.value = '';
          });
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

  return (
    <div className="page">
      <button className={styles.btnBack} onClick={() => navigate('/')}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className={styles.detailHero}>
        <p className={styles.detailKicker}>Bundle Group</p>
        <div className={styles.detailHeader}>
          <h2>{group.name}</h2>
          <span
            className={`${styles.badge} ${group.isActive ? styles.activeBadge : styles.inactiveBadge}`}
          >
            {group.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <p className={styles.detailSubtitle}>
          Manage uploaded OTA bundle archives from one place.
        </p>
      </div>

      <div className={styles.detailInfo}>
        <div className={`${styles.infoCard} ${styles.infoCardEmphasis}`}>
          <span className={styles.infoLabel}>Bundle Version</span>
          <span className={styles.infoValue}>{group.version}</span>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Created</span>
          <span className={`${styles.infoValue} ${styles.infoValueSecondary}`}>
            {new Date(group.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Files Ready</span>
          <span className={`${styles.infoValue} ${styles.infoValueSecondary}`}>
            {
              [group.androidBundleUrl, group.iosBundleUrl].filter(Boolean)
                .length
            }
            /2 uploaded
          </span>
        </div>
      </div>

      <section className={styles.detailSection}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Current Files</h3>
          <p className={styles.sectionCopy}>
            Review the latest uploaded archives and their availability.
          </p>
        </div>
        <div className={styles.filesGrid}>
          <div
            className={`${styles.fileCard} ${group.androidBundleUrl ? styles.fileCardUploaded : ''}`}
          >
            <div className={styles.fileCardHead}>
              <span className={styles.filePlatform}>Android</span>
              <FileArchive size={22} />
            </div>
            <span className={styles.fileLabel}>index.android.bundle.zip</span>
            <span className={styles.fileCaption}>
              Production archive served to Android clients.
            </span>
            {group.androidBundleUrl ? (
              <>
                <span
                  className={`${styles.fileStatus} ${styles.fileStatusUploaded}`}
                >
                  Uploaded and available
                </span>
              </>
            ) : (
              <span
                className={`${styles.fileStatus} ${styles.fileStatusPending}`}
              >
                Waiting for upload
              </span>
            )}
          </div>
          <div
            className={`${styles.fileCard} ${group.iosBundleUrl ? styles.fileCardUploaded : ''}`}
          >
            <div className={styles.fileCardHead}>
              <span className={styles.filePlatform}>iOS</span>
              <FileArchive size={22} />
            </div>
            <span className={styles.fileLabel}>main.jsbundle.zip</span>
            <span className={styles.fileCaption}>
              Production archive served to iOS clients.
            </span>
            {group.iosBundleUrl ? (
              <>
                <span
                  className={`${styles.fileStatus} ${styles.fileStatusUploaded}`}
                >
                  Uploaded and available
                </span>
              </>
            ) : (
              <span
                className={`${styles.fileStatus} ${styles.fileStatusPending}`}
              >
                Waiting for upload
              </span>
            )}
          </div>
        </div>
      </section>

      <section className={styles.detailSection}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Upload Files</h3>
          <p className={styles.sectionCopy}>
            Select one or both ZIP archives below, then upload them together in
            a single request.
          </p>
        </div>
        <form className={styles.uploadForm} onSubmit={handleUpload}>
          <div className={styles.uploadGrid}>
            <div
              className={`${styles.uploadCard} ${androidFile ? styles.uploadCardSelected : ''}`}
            >
              <div className={styles.uploadCardTop}>
                <div>
                  <span className={styles.uploadCardTitle}>Android Bundle</span>
                  <span className={styles.uploadCardMeta}>ZIP archive</span>
                </div>
                <FileArchive size={20} />
              </div>
              <p className={styles.uploadCardDescription}>
                Upload the Android OTA package for this bundle version.
              </p>
              <span className={styles.uploadSelectedName}>
                {androidFile ? androidFile.name : 'index.android.bundle.zip'}
              </span>
              <label className={styles.uploadSelectBtn} htmlFor="android-file">
                Choose Android File
              </label>
              <input
                className={styles.uploadInput}
                id="android-file"
                type="file"
                accept=".zip"
                onChange={handleFileChange(setAndroidFile)}
              />
            </div>

            <div
              className={`${styles.uploadCard} ${iosFile ? styles.uploadCardSelected : ''}`}
            >
              <div className={styles.uploadCardTop}>
                <div>
                  <span className={styles.uploadCardTitle}>iOS Bundle</span>
                  <span className={styles.uploadCardMeta}>ZIP archive</span>
                </div>
                <FileArchive size={20} />
              </div>
              <p className={styles.uploadCardDescription}>
                Upload the iOS OTA package for this bundle version.
              </p>
              <span className={styles.uploadSelectedName}>
                {iosFile ? iosFile.name : 'main.jsbundle.zip'}
              </span>
              <label className={styles.uploadSelectBtn} htmlFor="ios-file">
                Choose iOS File
              </label>
              <input
                className={styles.uploadInput}
                id="ios-file"
                type="file"
                accept=".zip"
                onChange={handleFileChange(setIosFile)}
              />
            </div>
          </div>

          <div className={styles.uploadActions}>
            <button
              type="submit"
              className="btn-primary"
              disabled={uploadMutation.isPending || (!androidFile && !iosFile)}
            >
              <Upload size={16} />{' '}
              {uploadMutation.isPending ? 'Uploading...' : 'Upload Files'}
            </button>
            <span className={styles.uploadNote}>
              You can upload one file or both files at the same time.
            </span>
          </div>
        </form>
      </section>
    </div>
  );
}
