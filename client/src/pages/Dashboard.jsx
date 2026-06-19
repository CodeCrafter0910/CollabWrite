import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { documents } from '../utils/api';
import DocumentCard from '../components/DocumentCard';
import UploadDialog from '../components/UploadDialog';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [myDocs, setMyDocs] = useState([]);
  const [sharedDocs, setSharedDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const data = await documents.list();
      // Filter list directly as API returns a flat array of docs with access_level
      setMyDocs(data.filter((doc) => doc.access_level === 'owner'));
      setSharedDocs(data.filter((doc) => doc.access_level !== 'owner'));
    } catch (err) {
      toast.error('Failed to load documents');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleNewDocument = async () => {
    try {
      const data = await documents.create({ title: 'Untitled Document' });
      navigate(`/editor/${data.id}`);
    } catch (err) {
      toast.error(err.message || 'Could not create document');
    }
  };

  const handleDelete = async (id) => {
    try {
      await documents.delete(id);
      setMyDocs((prev) => prev.filter((d) => d.id !== id));
      toast.success('Document deleted');
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // even if logout API fails, clear local state
    }
  };

  return (
    <>
      {/* Header */}
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">📝</span>
          <span>CollabWrite</span>
        </div>
        <div className="user-section">
          <div className="user-avatar">
            {user?.displayName?.charAt(0).toUpperCase() || '?'}
          </div>
          <span className="user-name">{user?.displayName}</span>
          <button className="btn-ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="dashboard">
        <div className="dashboard-actions">
          <button className="btn-primary" onClick={handleNewDocument}>
            + New Document
          </button>
          <button className="btn-secondary" onClick={() => setShowUpload(true)}>
            ↑ Upload File
          </button>
        </div>

        {loading ? (
          // Loading skeletons
          <div className="doc-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton skeleton-card" />
            ))}
          </div>
        ) : (
          <>
            {/* My Documents */}
            <section className="dashboard-section">
              <h2>My Documents</h2>
              {myDocs.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">📄</div>
                  <p>No documents yet. Create one to get started!</p>
                </div>
              ) : (
                <div className="doc-grid">
                  {myDocs.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Shared with me */}
            <section className="dashboard-section">
              <h2>Shared with Me</h2>
              {sharedDocs.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">🤝</div>
                  <p>No documents have been shared with you yet.</p>
                </div>
              ) : (
                <div className="doc-grid">
                  {sharedDocs.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      isShared
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Upload dialog */}
      {showUpload && (
        <UploadDialog
          onClose={() => {
            setShowUpload(false);
            fetchDocuments(); // refresh after possible upload
          }}
        />
      )}
    </>
  );
}
