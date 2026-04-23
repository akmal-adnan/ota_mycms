import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, ChevronDown, CheckCircle2, Clock } from 'lucide-react';
import { useReleases } from '../../hooks/useReleases';
import { useToggleReleaseBundle } from '../../hooks/useReleases';
import { ReleasesPageSkeleton } from '../../components/Skeleton';
import styles from './ReleaseDetailPage.module.css';

export default function ReleaseDetailPage() {
  const { projectId, targetVersion } = useParams<{
    projectId: string;
    targetVersion: string;
  }>();
  const { data: groups, isLoading } = useReleases(projectId!);
  const toggleMutation = useToggleReleaseBundle(projectId!);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const decodedVersion = decodeURIComponent(targetVersion ?? '');
  const group = groups?.find((g) => g.targetAppVersion === decodedVersion);

  const handleToggle = (bundleId: string, currentActive: boolean) => {
    toggleMutation.mutate({ bundleId, isActive: !currentActive });
  };

  if (isLoading) return <ReleasesPageSkeleton />;

  return (
    <>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link
          to={`/projects/${projectId}/releases`}
          className={styles.breadcrumbLink}
        >
          Releases
        </Link>
        <ChevronRight size={14} />
        <span className={styles.breadcrumbCurrent}>v{decodedVersion}</span>
      </nav>

      <div className="page-header">
        <h2>Target Version {decodedVersion}</h2>
      </div>

      {!group || group.bundles.length === 0 ? (
        <p className="empty">No released bundles for this target version.</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Bundle Version</th>
                <th>Title</th>
                <th>Active</th>
                <th>Released</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {group.bundles.map((bundle) => (
                <>
                  <tr
                    key={bundle._id}
                    onClick={() =>
                      setExpandedId((prev) =>
                        prev === bundle._id ? null : bundle._id,
                      )
                    }
                  >
                    <td>
                      <span className={styles.versionBadge}>
                        {bundle.bundleVersion}
                      </span>
                    </td>
                    <td>{bundle.title || '—'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
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
                    </td>
                    <td className={styles.dateCell}>
                      {new Date(bundle.updatedAt).toLocaleDateString()}
                    </td>
                    <td>
                      {expandedId === bundle._id ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </td>
                  </tr>
                  {expandedId === bundle._id && (
                    <tr
                      key={`${bundle._id}-detail`}
                      className={styles.detailRow}
                    >
                      <td colSpan={5}>
                        <div className={styles.detailContent}>
                          <div className={styles.detailItem}>
                            <label>Name</label>
                            <span>{bundle.name}</span>
                          </div>
                          <div className={styles.detailItem}>
                            <label>Bundle Version</label>
                            <span>{bundle.bundleVersion}</span>
                          </div>
                          <div
                            className={`${styles.detailItem} ${styles.fullWidth}`}
                          >
                            <label>Description</label>
                            <span>
                              {bundle.description || 'No description'}
                            </span>
                          </div>
                          <div className={styles.detailItem}>
                            <label>Files</label>
                            <div className={styles.filesRow}>
                              <span
                                className={`${styles.fileBadge} ${
                                  bundle.androidBundleUrl
                                    ? styles.fileBadgeAndroid
                                    : styles.fileBadgePending
                                }`}
                              >
                                {bundle.androidBundleUrl ? (
                                  <CheckCircle2 size={12} />
                                ) : (
                                  <Clock size={12} />
                                )}
                                Android
                              </span>
                              <span
                                className={`${styles.fileBadge} ${
                                  bundle.iosBundleUrl
                                    ? styles.fileBadgeIos
                                    : styles.fileBadgePending
                                }`}
                              >
                                {bundle.iosBundleUrl ? (
                                  <CheckCircle2 size={12} />
                                ) : (
                                  <Clock size={12} />
                                )}
                                iOS
                              </span>
                            </div>
                          </div>
                          <div className={styles.detailItem}>
                            <label>Created</label>
                            <span>
                              {new Date(bundle.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
