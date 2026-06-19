import { useState, useEffect } from 'react';
import { sharing } from '../utils/api';
import toast from 'react-hot-toast';

export default function ShareDialog({ docId, ownerId, ownerName, onClose }) {
  const [shares, setShares] = useState([]);
  const [username, setUsername] = useState('');
  const [permission, setPermission] = useState('viewer');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch current shares on mount
  useEffect(() => {
    sharing
      .list(docId)
      .then((data) => setShares(data || []))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [docId]);

  const handleShare = async (e) => {
    e.preventDefault();

    const trimmed = username.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const data = await sharing.share(docId, trimmed, permission);
      // Add the new share to the list
      setShares((prev) => [...prev, data]);
      setUsername('');
      toast.success(`Shared with ${trimmed}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (userId, displayName) => {
    try {
      await sharing.revoke(docId, userId);
      setShares((prev) => prev.filter((s) => s.user_id !== userId));
      toast.success(`Removed ${displayName}'s access`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Share Document</h2>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Owner info */}
          <div className="share-item" style={{ borderBottom: '1px solid var(--border-default)', marginBottom: 16, paddingBottom: 12 }}>
            <div className="share-item-info">
              <div className="share-item-avatar">
                {(ownerName || 'O').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="share-item-name">{ownerName || 'Owner'}</div>
                <div className="share-item-username">Document owner</div>
              </div>
            </div>
            <span className="badge badge-owner">Owner</span>
          </div>

          {/* Share form */}
          <form onSubmit={handleShare} className="share-form">
            <input
              type="text"
              placeholder="Enter username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={submitting}
            />
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              disabled={submitting}
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || !username.trim()}
            >
              {submitting ? 'Sharing...' : 'Share'}
            </button>
          </form>

          {/* Current shares */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : shares.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: '0.875rem' }}>
              Not shared with anyone yet
            </p>
          ) : (
            <ul className="share-list">
              {shares.map((share) => (
                <li key={share.user_id} className="share-item">
                  <div className="share-item-info">
                    <div className="share-item-avatar">
                      {(share.displayName || share.username || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="share-item-name">{share.displayName || share.username}</div>
                      {share.username && (
                        <div className="share-item-username">@{share.username}</div>
                      )}
                    </div>
                  </div>
                  <div className="share-item-actions">
                    <span className={`badge badge-${share.permission}`}>
                      {share.permission}
                    </span>
                    <button
                      className="btn-ghost"
                      onClick={() => handleRevoke(share.user_id, share.displayName || share.username)}
                      title="Remove access"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
