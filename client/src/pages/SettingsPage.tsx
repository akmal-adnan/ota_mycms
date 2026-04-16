import { useState } from 'react';
import { Copy, Check, RefreshCw, Eye, EyeOff, Key } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiKeyApi, regenerateApiKeyApi } from '../api/auth';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const { data: keyInfo, isLoading } = useQuery({
    queryKey: ['api-key'],
    queryFn: getApiKeyApi,
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateApiKeyApi,
    onSuccess: (data) => {
      setRevealedKey(data.otaApiKey);
      queryClient.invalidateQueries({ queryKey: ['api-key'] });
    },
  });

  const handleCopyKey = async () => {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const handleRegenerate = () => {
    if (
      window.confirm(
        'Regenerate your API key? The current key will stop working immediately for all React Native apps using it.',
      )
    ) {
      setRevealedKey(null);
      regenerateMutation.mutate();
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Account Settings</h2>
      </div>

      <div className="settings-section">
        <h3>
          <Key size={18} /> OTA API Key
        </h3>
        <p className="settings-description">
          Use this key in your React Native app's <code>x-ota-key</code> header
          to authenticate bundle update requests.
        </p>

        {isLoading ? (
          <p>Loading...</p>
        ) : revealedKey ? (
          <div className="api-key-card">
            <div className="api-key-reveal">
              <code className="api-key-value">{revealedKey}</code>
              <button
                className={`btn-icon ${keyCopied ? 'copied' : ''}`}
                onClick={handleCopyKey}
              >
                {keyCopied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <p className="api-key-warning">
              Copy this key now. You won't be able to see it again.
            </p>
          </div>
        ) : (
          <div className="api-key-card">
            <div className="api-key-preview">
              <span className="api-key-label">Current key:</span>
              <code>
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
            {keyInfo?.createdAt && (
              <p className="api-key-meta">
                Created: {new Date(keyInfo.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        <button
          className="btn-danger"
          onClick={handleRegenerate}
          disabled={regenerateMutation.isPending}
        >
          <RefreshCw size={16} />{' '}
          {regenerateMutation.isPending
            ? 'Regenerating...'
            : 'Regenerate API Key'}
        </button>
      </div>
    </div>
  );
}
