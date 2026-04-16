import { useState, useCallback, useRef, useLayoutEffect } from 'react';
import type { ModalAction, ModalVariant } from './index';

interface UseModalOptions {
  title: string;
  variant?: ModalVariant;
  size?: 'sm' | 'md' | 'lg';
  closeButton?: boolean;
}

interface ModalState {
  isOpen: boolean;
  content: React.ReactNode;
  title: string;
  variant: ModalVariant;
  size: 'sm' | 'md' | 'lg';
  closeButton: boolean;
  actions: ModalAction[];
}

interface UseModalReturn extends ModalState {
  open: (
    content: React.ReactNode,
    actions?: ModalAction[],
    options?: Partial<UseModalOptions>,
  ) => void;
  close: () => void;
  confirm: (
    message: React.ReactNode,
    onConfirm: () => void,
    options?: Partial<UseModalOptions>,
  ) => void;
  alert: (message: React.ReactNode, options?: Partial<UseModalOptions>) => void;
  error: (message: React.ReactNode, options?: Partial<UseModalOptions>) => void;
  success: (
    message: React.ReactNode,
    options?: Partial<UseModalOptions>,
  ) => void;
}

const DEFAULT_STATE: ModalState = {
  isOpen: false,
  content: null,
  title: 'Dialog',
  variant: 'default',
  size: 'md',
  closeButton: true,
  actions: [],
};

export function useModal(
  defaultOptions?: Partial<UseModalOptions>,
): UseModalReturn {
  const defaultOptionsRef = useRef(defaultOptions);
  useLayoutEffect(() => {
    defaultOptionsRef.current = defaultOptions;
  });

  const [state, setState] = useState<ModalState>(DEFAULT_STATE);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const open = useCallback(
    (
      newContent: React.ReactNode,
      newActions: ModalAction[] = [],
      options?: Partial<UseModalOptions>,
    ) => {
      const defaults = defaultOptionsRef.current;
      setState({
        isOpen: true,
        content: newContent,
        actions: newActions,
        title: options?.title ?? defaults?.title ?? 'Dialog',
        variant: options?.variant ?? defaults?.variant ?? 'default',
        size: options?.size ?? defaults?.size ?? 'md',
        closeButton: options?.closeButton ?? defaults?.closeButton ?? true,
      });
    },
    [],
  );

  const confirm = useCallback(
    (
      message: React.ReactNode,
      onConfirm: () => void,
      options?: Partial<UseModalOptions>,
    ) => {
      open(
        message,
        [
          { label: 'Cancel', onClick: close, variant: 'secondary' },
          {
            label: 'Confirm',
            onClick: () => {
              onConfirm();
              close();
            },
            variant: 'primary',
          },
        ],
        { title: 'Confirm', variant: 'default', size: 'sm', ...options },
      );
    },
    [open, close],
  );

  const alert = useCallback(
    (message: React.ReactNode, options?: Partial<UseModalOptions>) => {
      open(message, [{ label: 'OK', onClick: close, variant: 'primary' }], {
        title: 'Alert',
        variant: 'info',
        size: 'sm',
        ...options,
      });
    },
    [open, close],
  );

  const error = useCallback(
    (message: React.ReactNode, options?: Partial<UseModalOptions>) => {
      alert(message, {
        title: 'Error',
        variant: 'error',
        size: 'sm',
        ...options,
      });
    },
    [alert],
  );

  const success = useCallback(
    (message: React.ReactNode, options?: Partial<UseModalOptions>) => {
      alert(message, {
        title: 'Success',
        variant: 'success',
        size: 'sm',
        ...options,
      });
    },
    [alert],
  );

  return { ...state, open, close, confirm, alert, error, success };
}
