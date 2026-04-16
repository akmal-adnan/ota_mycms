import { X, CircleAlert, CircleCheck, Info, LoaderCircle } from 'lucide-react';
import { useToastStore, type ToastItem } from '../../stores/toastStore';
import styles from './ToastViewport.module.css';

const variantStyles = {
  success: styles.toastSuccess,
  error: styles.toastError,
  info: styles.toastInfo,
  loading: styles.toastLoading,
} as const;

function toastIcon(toast: ToastItem) {
  if (toast.variant === 'loading') {
    return <LoaderCircle size={16} className={styles.toastSpinner} />;
  }
  if (toast.variant === 'success') return <CircleCheck size={16} />;
  if (toast.variant === 'error') return <CircleAlert size={16} />;
  return <Info size={16} />;
}

export default function ToastViewport() {
  const { toasts, removeToast } = useToastStore();

  if (!toasts.length) return null;

  return (
    <section
      className={styles.toastViewport}
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <article
          key={toast.id}
          className={`${styles.toast} ${variantStyles[toast.variant]}`}
        >
          <span className={styles.toastIcon}>{toastIcon(toast)}</span>
          <p className={styles.toastMessage}>{toast.message}</p>
          <button
            className={styles.toastClose}
            onClick={() => removeToast(toast.id)}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </article>
      ))}
    </section>
  );
}
