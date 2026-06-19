import { useState, useEffect } from 'react';
import { versions as versionsApi } from '../utils/api';
import toast from 'react-hot-toast';

/**
 * Slide-out version history panel.
 * Shows a list of saved versions with timestamps and restore buttons.
 */
export default function VersionHistory({ docId, onRestore, onClose }) {
  const [versionList, setVersionList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState(null);

  useEffect(() => {
    versionsApi
      .list(docId)
      .then((data) => setVersionList(data || []))
      .catch((err) => toast.error('Failed to load versions: ' + err.message))
      .finally(() => setLoading(false));
  }, [docId]);

  const handleRestore = async (versionId) => {
    if (!window.confirm('Restore this version? Current content will be replaced.')) {
      return;
    }

    setRestoringId(versionId);
    try {
      const data = await versionsApi.restore(docId, versionId);
      toast.success('Version restored');
      if (onRestore) onRestore(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRestoringId(null);
    }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Relative time helper
  const relativeTime = (dateStr) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (seconds < 60) return 'just now';
    const min = Math.floor(seconds / 60);
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="version-panel">
      <div className="version-panel-header">
        <h3>Version History</h3>
        <button className="btn-ghost" onClick={onClose}>✕</button>
      </div>

      <div className="version-list">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : versionList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No versions saved yet
          </div>
        ) : (
          versionList.map((version) => (
            <div key={version.id} className="version-item">
               <div>
                <div className="version-item-time">{formatTime(version.created_at)}</div>
                <div className="version-item-relative">{relativeTime(version.created_at)}</div>
              </div>
              <button
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                onClick={() => handleRestore(version.id)}
                disabled={restoringId !== null}
              >
                {restoringId === version.id ? 'Restoring...' : 'Restore'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
