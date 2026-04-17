import { useState, useCallback } from 'react';
import { Copy, Check, RefreshCw, Eye, EyeOff, Key, Shield } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiKeyApi, regenerateApiKeyApi } from '../../api/auth';
import { queryKeys } from '../../lib/queryClient';
import { SettingsKeySkeleton } from '../../components/Skeleton';
import { getApiErrorMessage } from '../../utils/apiError';
import { useToastStore } from '../../stores/toastStore';
import { Modal } from '../../components/Modal';
import { useModal } from '../../components/Modal/useModal';
import styles from './SettingsPage.module.css';

function KeyRevealContent({ apiKey }: { apiKey: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [apiKey]);

  return (
    <div>
      <div className="api-key-reveal">
        <code className="api-key-value">{apiKey}</code>
        <button
          className={`btn-icon ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      <p className={styles.keyHint}>
        Copy this key now. You won't be able to see it again.
      </p>
    </div>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [showPreview, setShowPreview] = useState(false);
  const addLoadingToast = useToastStore((state) => state.addLoadingToast);
  const updateToast = useToastStore((state) => state.updateToast);
  const confirmModal = useModal();
  const keyModal = useModal();

  const {
    data: keyInfo,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.apiKey,
    queryFn: getApiKeyApi,
    staleTime: 60_000,
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateApiKeyApi,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKey });
      keyModal.open(
        <KeyRevealContent apiKey={data.otaApiKey} />,
        [{ label: 'Done', onClick: keyModal.close, variant: 'primary' }],
        { title: 'New API Key', variant: 'success', size: 'md' },
      );
    },
  });

  const handleRegenerate = () => {
    confirmModal.confirm(
      'Regenerate your API key? The current key will stop working immediately for all React Native apps using it.',
      () => {
        const loadingToastId = addLoadingToast('Regenerating API key...');
        regenerateMutation.mutate(undefined, {
          onSuccess: () => {
            updateToast(loadingToastId, 'API key regenerated.', 'success');
          },
          onError: (error) => {
            updateToast(
              loadingToastId,
              getApiErrorMessage(error, 'Failed to regenerate API key'),
              'error',
            );
          },
        });
      },
      {
        title: 'Regenerate API Key',
        variant: 'warning',
      },
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Settings</h2>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardIcon}>
            <Key size={18} />
          </div>
          <div>
            <h3 className={styles.cardTitle}>OTA API Key</h3>
            <p className={styles.cardDesc}>
              Use this key in your React Native app's <code>x-ota-key</code>{' '}
              header to authenticate bundle update requests.
            </p>
          </div>
        </div>

        {isLoading ? (
          <SettingsKeySkeleton />
        ) : isError ? (
          <p className="alert error">Unable to load API key information.</p>
        ) : (
          <div className={styles.keyRow}>
            <div className={styles.keyPreview}>
              <Shield size={14} className={styles.keyShieldIcon} />
              <code className={styles.keyCode}>
                {showPreview ? keyInfo?.keyPreview : '••••••••••••••••'}
              </code>
              <button
                className="btn-icon"
                onClick={() => setShowPreview(!showPreview)}
                title={showPreview ? 'Hide' : 'Show preview'}
              >
                {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {keyInfo?.createdAt ? (
              <span className={styles.keyMeta}>
                Created {new Date(keyInfo.createdAt).toLocaleDateString()}
              </span>
            ) : null}
          </div>
        )}

        <div className={styles.cardActions}>
          <button
            className="btn-danger"
            onClick={handleRegenerate}
            disabled={regenerateMutation.isPending}
          >
            <RefreshCw size={16} />
            {regenerateMutation.isPending
              ? 'Regenerating...'
              : 'Regenerate API Key'}
          </button>
        </div>
      </div>

      {/* Confirmation modal */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={confirmModal.close}
        title={confirmModal.title}
        variant={confirmModal.variant}
        size={confirmModal.size}
        actions={confirmModal.actions}
      >
        {confirmModal.content}
      </Modal>

      {/* New key reveal modal */}
      <Modal
        isOpen={keyModal.isOpen}
        onClose={keyModal.close}
        title={keyModal.title}
        variant={keyModal.variant}
        size={keyModal.size}
        closeButton={false}
        actions={keyModal.actions}
      >
        {keyModal.content}
      </Modal>
    </div>
  );
}
