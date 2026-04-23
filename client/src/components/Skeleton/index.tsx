import styles from './Skeleton.module.css';

type SkeletonProps = {
  className?: string;
};

function withSkeletonClass(className?: string): string {
  const variantClassMap: Record<string, string> = {
    'skeleton-row': styles.skeletonRow,
    'skeleton-title': styles.skeletonTitle,
    'skeleton-subtitle': styles.skeletonSubtitle,
    'skeleton-card': styles.skeletonCard,
    'skeleton-inline': styles.skeletonInline,
  };

  const variantClass = className ? variantClassMap[className] : '';
  return variantClass ? `${styles.skeleton} ${variantClass}` : styles.skeleton;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={withSkeletonClass(className)} aria-hidden="true" />;
}

export function ProjectsPageSkeleton() {
  return (
    <section className={styles.skeletonPage} aria-hidden="true">
      <div className={styles.skeletonTable}>
        <Skeleton className="skeleton-row" />
        <Skeleton className="skeleton-row" />
        <Skeleton className="skeleton-row" />
        <Skeleton className="skeleton-row" />
        <Skeleton className="skeleton-row" />
      </div>
    </section>
  );
}

export function BundleManagerSkeleton() {
  return (
    <section className={styles.skeletonPage} aria-hidden="true">
      <Skeleton className="skeleton-title" />
      <Skeleton className="skeleton-subtitle" />
      <div className={styles.skeletonGrid3} style={{ marginBottom: '1rem' }}>
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonCard} />
      </div>
      <div className={styles.skeletonGrid2}>
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonCard} />
      </div>
    </section>
  );
}

export function BundleListSkeleton() {
  return (
    <section className={styles.skeletonPage} aria-hidden="true">
      <Skeleton className="skeleton-title" />
      <div className={styles.skeletonTable}>
        <Skeleton className="skeleton-row" />
        <Skeleton className="skeleton-row" />
        <Skeleton className="skeleton-row" />
      </div>
    </section>
  );
}

export function ReleasesPageSkeleton() {
  return (
    <section className={styles.skeletonPage} aria-hidden="true">
      <Skeleton className="skeleton-title" />
      <Skeleton className="skeleton-subtitle" />
      <div className={styles.skeletonGrid2}>
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonCard} />
      </div>
    </section>
  );
}
