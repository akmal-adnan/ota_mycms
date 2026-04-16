import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import {
  useBundleGroups,
  useCreateBundleGroup,
  useDeleteBundleGroup,
  useUpdateBundleGroup,
} from '../hooks/useBundleGroups';

export default function DashboardPage() {
  const { data: groups, isLoading } = useBundleGroups();
  const createMutation = useCreateBundleGroup();
  const deleteMutation = useDeleteBundleGroup();
  const updateMutation = useUpdateBundleGroup();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');

  const handleCreate = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    createMutation.mutate(
      { name, version: parseInt(version, 10) },
      {
        onSuccess: () => {
          setName('');
          setVersion('');
          setShowForm(false);
        },
      },
    );
  };

  const handleDelete = (id: string, groupName: string) => {
    if (
      window.confirm(
        `Delete "${groupName}"? This will remove all uploaded files.`,
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleActive = (id: string, currentActive: boolean) => {
    updateMutation.mutate({ id, updates: { isActive: !currentActive } });
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Bundle Groups</h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> New Group
        </button>
      </div>

      {showForm && (
        <form className="create-form" onSubmit={handleCreate}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="groupName">Group Name</label>
              <input
                id="groupName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Release 1.2.0"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="groupVersion">Bundle Version Number</label>
              <input
                id="groupVersion"
                type="number"
                min="1"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. 1"
                required
              />
            </div>
          </div>
          {createMutation.error && (
            <div className="alert error">
              {(
                createMutation.error as unknown as {
                  response?: { data?: { error?: string } };
                }
              )?.response?.data?.error || 'Failed to create'}
            </div>
          )}
          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Group'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="loading">Loading...</p>
      ) : !groups?.length ? (
        <p className="empty">
          No bundle groups yet. Create one to get started.
        </p>
      ) : (
        <div className="table-wrapper">
          <table className="bundle-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Bundle Version</th>
                <th>Android</th>
                <th>iOS</th>
                <th>Active</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g._id}>
                  <td>
                    <Link to={`/groups/${g.version}`} className="group-link">
                      {g.name}
                    </Link>
                  </td>
                  <td>{g.version}</td>
                  <td>
                    {g.androidBundleUrl ? (
                      <span className="badge android">Uploaded</span>
                    ) : (
                      <span className="badge empty-badge">—</span>
                    )}
                  </td>
                  <td>
                    {g.iosBundleUrl ? (
                      <span className="badge ios">Uploaded</span>
                    ) : (
                      <span className="badge empty-badge">—</span>
                    )}
                  </td>
                  <td>
                    <button
                      className={`toggle-btn ${g.isActive ? 'active' : ''}`}
                      onClick={() => handleToggleActive(g._id, g.isActive)}
                      title={g.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <span className="toggle-track">
                        <span className="toggle-thumb" />
                      </span>
                    </button>
                  </td>
                  <td>{new Date(g.createdAt).toLocaleDateString()}</td>
                  <td className="row-actions">
                    <Link
                      to={`/groups/${g.version}`}
                      className="action-btn"
                      title="Details"
                    >
                      <ExternalLink size={14} />
                      Details
                    </Link>
                    <button
                      className="action-btn danger"
                      onClick={() => handleDelete(g._id, g.name)}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
