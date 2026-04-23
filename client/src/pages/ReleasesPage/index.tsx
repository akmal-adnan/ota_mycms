import { ChevronRight, Package, Rocket } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useProjectReleases, useProjects } from '../../hooks/useProjects';
import { DashboardTableSkeleton } from '../../components/Skeleton';
import type { Bundle } from '../../types';
import styles from './ReleasesPage.module.css';

export default function ReleasesPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { data: projects } = useProjects();
  const { data: releases, isLoading } = useProjectReleases(projectId);

  const project = projects?.find((item) => item._id === projectId);

  const groupedReleases = (releases ?? []).reduce<Record<string, Bundle[]>>(
    (acc, bundle) => {
      const key = bundle.targetVersion?.trim() || 'Unspecified Target Version';
      if (!acc[key]) acc[key] = [];
      acc[key].push(bundle);
      return acc;
    },
    {},
  );

  const sortedGroups = Object.entries(groupedReleases).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  return (
    <div className="page">
      <nav className={styles.breadcrumb}>
        <Link to="/" className={styles.breadcrumbLink}>
          Projects
        </Link>
        <ChevronRight size={14} />
        <Link
          to={`/projects/${projectId}/bundles`}
          className={styles.breadcrumbLink}
        >
          {project?.name ?? 'Project'}
        </Link>
        <ChevronRight size={14} />
        <span className={styles.breadcrumbCurrent}>Releases</span>
      </nav>

      <div className="page-header">
        <div>
          <h2>Releases</h2>
          <p className={styles.subtitle}>
            Released bundles grouped by target version for{' '}
            {project?.name ?? 'this project'}.
          </p>
        </div>
      </div>

      {isLoading ? (
        <DashboardTableSkeleton />
      ) : !releases?.length ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Rocket size={30} />
          </div>
          <h3>No releases yet</h3>
          <p>Release a bundle from Bundle Manager to see it listed here.</p>
          <Link to={`/projects/${projectId}/bundles`} className="btn-primary">
            <Package size={15} /> Go to Bundle Manager
          </Link>
        </div>
      ) : (
        <div className={styles.releaseGroups}>
          {sortedGroups.map(([targetVersion, bundles]) => (
            <section className={styles.releaseGroup} key={targetVersion}>
              <header className={styles.groupHeader}>
                <h3>{targetVersion}</h3>
                <span>
                  {bundles.length} bundle{bundles.length > 1 ? 's' : ''}
                </span>
              </header>

              <div className={styles.bundleList}>
                {bundles
                  .slice()
                  .sort((a, b) =>
                    (b.releasedAt || '').localeCompare(a.releasedAt || ''),
                  )
                  .map((bundle) => (
                    <article className={styles.bundleCard} key={bundle._id}>
                      <div className={styles.bundleCardHead}>
                        <strong>{bundle.name}</strong>
                        <span className={styles.versionBadge}>
                          v{bundle.version}
                        </span>
                      </div>

                      <p className={styles.bundleMeta}>
                        Android:{' '}
                        {bundle.androidBundleUrl ? 'Uploaded' : 'Missing'} |
                        iOS: {bundle.iosBundleUrl ? 'Uploaded' : 'Missing'}
                      </p>

                      <p className={styles.bundleDate}>
                        Released{' '}
                        {bundle.releasedAt
                          ? new Date(bundle.releasedAt).toLocaleString(
                              'en-US',
                              {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              },
                            )
                          : 'Unknown date'}
                      </p>
                    </article>
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
