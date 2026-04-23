import { Link, useParams } from 'react-router-dom';
import { Rocket, Package } from 'lucide-react';
import { useReleases } from '../../hooks/useReleases';
import { ReleasesPageSkeleton } from '../../components/Skeleton';
import styles from './ReleasesPage.module.css';

export default function ReleasesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: groups, isLoading } = useReleases(projectId!);

  if (isLoading) return <ReleasesPageSkeleton />;

  return (
    <>
      <div className="page-header">
        <h2>Releases</h2>
      </div>

      {groups && groups.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Rocket size={26} />
          </div>
          <h3>No releases yet</h3>
          <p>Release bundles from the Bundles page to see them here.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {groups?.map((group) => (
            <Link
              key={group.targetAppVersion}
              to={`/projects/${projectId}/releases/${encodeURIComponent(group.targetAppVersion)}`}
              className={styles.card}
            >
              <span className={styles.cardVersion}>
                v{group.targetAppVersion}
              </span>
              <div className={styles.cardMeta}>
                <Package size={14} />
                <span className={styles.cardCount}>{group.bundles.length}</span>
                bundle{group.bundles.length !== 1 ? 's' : ''} released
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
