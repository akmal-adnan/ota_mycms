import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Key, Trash2, X, Copy, Check } from 'lucide-react';
import {
  useAddApiKey,
  useApiKeys,
  useRemoveApiKey,
} from '../../hooks/useApiKeys';
import { useModal } from '../../components/Modal/useModal';
import { Modal } from '../../components/Modal';
import { getApiErrorMessage } from '../../utils/apiError';
import { useToastStore } from '../../stores/toastStore';
import styles from './ApiKeysPage.module.css';

export default function ApiKeysPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: apiKeysData } = useApiKeys(projectId!);
  const addMutation = useAddApiKey(projectId!);
  const removeMutation = useRemoveApiKey(projectId!);
  const addLoadingToast = useToastStore((s) => s.addLoadingToast);
  const updateToast = useToastStore((s) => s.updateToast);
  const deleteModal = useModal();
  const keyModal = useModal();

  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [revealedKey, setRevealedKey] = useState('');
  const [copied, setCopied] = useState(false);
  const apiKeys = apiKeysData ?? [];

  const handleCopy = async (value = revealedKey) => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const loadingId = addLoadingToast('Creating API key...');
    addMutation.mutate(label, {
      onSuccess: (data) => {
        setLabel('');
        setShowForm(false);
        updateToast(loadingId, 'API key created.', 'success');
        setRevealedKey(data.apiKey.key);
        keyModal.open(
          <div className={styles.keyReveal}>
            <div className={styles.keyRevealValue}>
              <span className={styles.keyRevealText}>{data.apiKey.key}</span>
              <button
                className={`btn-icon ${copied ? 'copied' : ''}`}
                onClick={() => handleCopy(data.apiKey.key)}
                type="button"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <p className={styles.keyRevealHint}>
              Make sure to save this key. It will not be shown again.
            </p>
          </div>,
          [{ label: 'Done', variant: 'primary', onClick: keyModal.close }],
          { title: 'API Key Created', variant: 'success', closeButton: false },
        );
      },
      onError: (err) => {
        updateToast(
          loadingId,
          getApiErrorMessage(err, 'Failed to create API key'),
          'error',
        );
      },
    });
  };

  const confirmRemove = (keyId: string, keyLabel: string) => {
    deleteModal.confirm(
      'Any clients using this key will lose access. This cannot be undone.',
      () => {
        const loadingId = addLoadingToast(`Removing ${keyLabel}...`);
        removeMutation.mutate(keyId, {
          onSuccess: () =>
            updateToast(loadingId, `Removed ${keyLabel}.`, 'success'),
          onError: (err) =>
            updateToast(
              loadingId,
              getApiErrorMessage(err, 'Failed to remove key'),
              'error',
            ),
        });
      },
      { title: `Remove "${keyLabel}" key?`, variant: 'warning' },
    );
  };

  return (
    <>
      <div className="page-header">
        <h2>API Keys</h2>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? (
            <>
              <X size={15} /> Cancel
            </>
          ) : (
            <>
              <Plus size={15} /> Add Key
            </>
          )}
        </button>
      </div>

      {showForm && (
        <form className={styles.createForm} onSubmit={handleCreate}>
          <div className="form-group">
            <label>Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. staging, production, tester"
              required
            />
          </div>
          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={addMutation.isPending}
            >
              <Plus size={15} />
              {addMutation.isPending ? 'Creating...' : 'Create Key'}
            </button>
          </div>
        </form>
      )}

      {apiKeys.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Key size={26} />
          </div>
          <h3>No API keys</h3>
          <p>Add an API key to allow OTA clients to access this project.</p>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={15} /> Add Key
          </button>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Label</th>
                <th>Key</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((k) => (
                <tr key={k._id}>
                  <td className={styles.labelCell}>{k.label}</td>
                  <td className={styles.keyPreview}>{k.key}</td>
                  <td className={styles.dateCell}>
                    {new Date(k.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      className={styles.removeBtn}
                      type="button"
                      onClick={() => confirmRemove(k._id, k.label)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        title={deleteModal.title}
        variant={deleteModal.variant}
        size={deleteModal.size}
        closeButton={deleteModal.closeButton}
        actions={deleteModal.actions}
      >
        {deleteModal.content}
      </Modal>

      {/* Key reveal modal */}
      <Modal
        isOpen={keyModal.isOpen}
        onClose={keyModal.close}
        title={keyModal.title}
        variant={keyModal.variant}
        size={keyModal.size}
        closeButton={keyModal.closeButton}
        actions={keyModal.actions}
      >
        {keyModal.content}
      </Modal>
    </>
  );
}
