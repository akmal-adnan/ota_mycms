import { memo, useCallback, useEffect, useId } from 'react';
import type { ReactNode, MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

export type ModalVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

export interface ModalAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  variant?: ModalVariant;
  actions?: ModalAction[];
  closeButton?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Hoisted to module level — static data, never needs to live inside a component
const iconMap: Record<ModalVariant, string> = {
  default: '◉',
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

// Stable default so memo() isn't defeated when `actions` is omitted
// (rerender-memo-with-default-value)
const EMPTY_ACTIONS: ModalAction[] = [];

export const Modal = memo(function Modal({
  isOpen,
  onClose,
  title,
  children,
  variant = 'default',
  actions = EMPTY_ACTIONS,
  closeButton = true,
  size = 'md',
}: ModalProps) {
  // useId for stable aria linkage between backdrop and title
  const titleId = useId();

  // Stable handler — only recreated when onClose identity changes
  // (rerender-no-inline-components / inline handler anti-pattern)
  const handleBackdropClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  // Escape key dismissal — interaction logic belongs in an effect tied to isOpen
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className={`${styles.modal} ${styles[size]} ${styles[variant]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleContainer}>
            <span className={styles.icon}>{iconMap[variant]}</span>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
          </div>
          {/* Use ternary, not &&, to avoid accidental falsy renders
              (rendering-conditional-render) */}
          {closeButton ? (
            <button
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close modal"
              type="button"
            >
              ✕
            </button>
          ) : null}
        </div>

        {/* Content */}
        <div className={styles.content}>{children}</div>

        {/* Actions */}
        {actions.length > 0 ? (
          <div className={styles.footer}>
            <div className={styles.actions}>
              {actions.map((action) => (
                <button
                  key={action.label}
                  className={`${styles.actionButton} ${styles[action.variant ?? 'secondary']}`}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  type="button"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
});
