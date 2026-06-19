import { useNavigate } from 'react-router-dom';

/**
 * Strips HTML tags and returns plain text, truncated to `maxLen`.
 * Good enough for card previews — not trying to be a full sanitizer.
 */
function stripHtml(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

/**
 * Converts an ISO date string to a human-friendly relative time.
 * Keeps it simple — no library needed for this.
 */
function timeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  // For older dates, just show the date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DocumentCard({ doc, isShared = false, onDelete }) {
  const navigate = useNavigate();

  const preview = stripHtml(doc.content);
  const truncated = preview.length > 100 ? preview.slice(0, 100) + '…' : preview;

  const handleClick = () => {
    navigate(`/editor/${doc.id}`);
  };

  const handleDelete = (e) => {
    e.stopPropagation(); // don't navigate when clicking delete
    if (window.confirm(`Delete "${doc.title}"? This can't be undone.`)) {
      onDelete(doc.id);
    }
  };

  return (
    <div className="doc-card" onClick={handleClick} role="button" tabIndex={0}>
      <div className="doc-card-header">
        <span className="doc-card-title">{doc.title || 'Untitled'}</span>
        {!isShared && onDelete && (
          <button
            className="btn-danger delete-btn"
            onClick={handleDelete}
            title="Delete document"
          >
            Delete
          </button>
        )}
      </div>

      <p className="doc-card-preview">
        {truncated || 'Empty document'}
      </p>

      <div className="doc-card-footer">
        <div className="doc-card-meta">
          {isShared && doc.owner_display_name && (
            <span className="doc-card-owner">by {doc.owner_display_name}</span>
          )}
          {isShared && doc.access_level && (
            <span className={`badge badge-${doc.access_level}`}>
              {doc.access_level}
            </span>
          )}
          <span>{timeAgo(doc.updated_at || doc.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
