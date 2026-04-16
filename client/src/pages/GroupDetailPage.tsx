import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileArchive } from 'lucide-react';
import {
  useBundleGroups,
  useUploadBundleFiles,
} from '../hooks/useBundleGroups';

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
        },
      },
    );
  };

  if (isLoading) return <p className="loading">Loading...</p>;
  if (!group) return <p className="empty">Group not found</p>;

  return (
    <div className="page">
      <button className="btn-back" onClick={() => navigate('/')}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="detail-hero">
        <p className="detail-kicker">Bundle Group</p>
        <div className="detail-header">
          <h2>{group.name}</h2>
          <span
            className={`badge ${group.isActive ? 'active-badge' : 'inactive-badge'}`}
          >
            {group.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <p className="detail-subtitle">
          Manage uploaded OTA bundle archives from one place.
        </p>
      </div>

      <div className="detail-info">
        <div className="info-card info-card-emphasis">
          <span className="info-label">Bundle Version</span>
          <span className="info-value">{group.version}</span>
        </div>
        <div className="info-card">
          <span className="info-label">Created</span>
          <span className="info-value info-value-secondary">
            {new Date(group.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className="info-card">
          <span className="info-label">Files Ready</span>
          <span className="info-value info-value-secondary">
            {
              [group.androidBundleUrl, group.iosBundleUrl].filter(Boolean)
                .length
            }
            /2 uploaded
          </span>
        </div>
      </div>

      <section className="detail-section">
        <div className="section-header">
          <h3 className="section-title">Current Files</h3>
          <p className="section-copy">
            Review the latest uploaded archives and their availability.
          </p>
        </div>
        <div className="files-grid">
          <div
            className={`file-card ${group.androidBundleUrl ? 'uploaded' : ''}`}
          >
            <div className="file-card-head">
              <span className="file-platform">Android</span>
              <FileArchive size={22} />
            </div>
            <span className="file-label">index.android.bundle.zip</span>
            <span className="file-caption">
              Production archive served to Android clients.
            </span>
            {group.androidBundleUrl ? (
              <>
                <span className="file-status uploaded">
                  Uploaded and available
                </span>
              </>
            ) : (
              <span className="file-status pending">Waiting for upload</span>
            )}
          </div>
          <div className={`file-card ${group.iosBundleUrl ? 'uploaded' : ''}`}>
            <div className="file-card-head">
              <span className="file-platform">iOS</span>
              <FileArchive size={22} />
            </div>
            <span className="file-label">main.jsbundle.zip</span>
            <span className="file-caption">
              Production archive served to iOS clients.
            </span>
            {group.iosBundleUrl ? (
              <>
                <span className="file-status uploaded">
                  Uploaded and available
                </span>
              </>
            ) : (
              <span className="file-status pending">Waiting for upload</span>
            )}
          </div>
        </div>
      </section>

      <section className="detail-section">
        <div className="section-header">
          <h3 className="section-title">Upload Files</h3>
          <p className="section-copy">
            Select one or both ZIP archives below, then upload them together in
            a single request.
          </p>
        </div>
        <form className="upload-form" onSubmit={handleUpload}>
          <div className="upload-grid">
            <div className={`upload-card ${androidFile ? 'selected' : ''}`}>
              <div className="upload-card-top">
                <div>
                  <span className="upload-card-title">Android Bundle</span>
                  <span className="upload-card-meta">ZIP archive</span>
                </div>
                <FileArchive size={20} />
              </div>
              <p className="upload-card-description">
                Upload the Android OTA package for this bundle version.
              </p>
              <span className="upload-selected-name">
                {androidFile ? androidFile.name : 'index.android.bundle.zip'}
              </span>
              <label className="upload-select-btn" htmlFor="android-file">
                Choose Android File
              </label>
              <input
                className="upload-input"
                id="android-file"
                type="file"
                accept=".zip"
                onChange={handleFileChange(setAndroidFile)}
              />
            </div>

            <div className={`upload-card ${iosFile ? 'selected' : ''}`}>
              <div className="upload-card-top">
                <div>
                  <span className="upload-card-title">iOS Bundle</span>
                  <span className="upload-card-meta">ZIP archive</span>
                </div>
                <FileArchive size={20} />
              </div>
              <p className="upload-card-description">
                Upload the iOS OTA package for this bundle version.
              </p>
              <span className="upload-selected-name">
                {iosFile ? iosFile.name : 'main.jsbundle.zip'}
              </span>
              <label className="upload-select-btn" htmlFor="ios-file">
                Choose iOS File
              </label>
              <input
                className="upload-input"
                id="ios-file"
                type="file"
                accept=".zip"
                onChange={handleFileChange(setIosFile)}
              />
            </div>
          </div>

          {uploadMutation.error && (
            <div className="alert error">Upload failed. Please try again.</div>
          )}
          {uploadMutation.isSuccess && (
            <div className="alert success">Files uploaded successfully!</div>
          )}

          <div className="upload-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={uploadMutation.isPending || (!androidFile && !iosFile)}
            >
              <Upload size={16} />{' '}
              {uploadMutation.isPending ? 'Uploading...' : 'Upload Files'}
            </button>
            <span className="upload-note">
              You can upload one file or both files at the same time.
            </span>
          </div>
        </form>
      </section>
    </div>
  );
}
