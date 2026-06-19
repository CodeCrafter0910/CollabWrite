import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useAuth } from '../hooks/useAuth';
import { useAutoSave } from '../hooks/useAutoSave';
import { documents } from '../utils/api';
import Toolbar from '../components/Toolbar';
import ShareDialog from '../components/ShareDialog';
import VersionHistory from '../components/VersionHistory';
import toast from 'react-hot-toast';

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  // Track whether the user can edit this document
  const isOwner = doc?.owner_id === user?.id;
  const canEdit = isOwner || doc?.accessLevel === 'editor';

  // We use a ref to hold the latest content for auto-save,
  // because the editor's onUpdate fires frequently and we don't
  // want to re-create the save function on every keystroke.
  const contentRef = useRef('');
  const titleRef = useRef('');

  const saveFn = useCallback(async () => {
    if (!canEdit || !id) return;
    await documents.update(id, {
      title: titleRef.current,
      content: contentRef.current,
    });
  }, [id, canEdit]);

  const { triggerSave, status: saveStatus } = useAutoSave(saveFn, 2000);

  // Set up TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
    ],
    content: '',
    editable: false, // will update once doc loads
    onUpdate: ({ editor }) => {
      contentRef.current = editor.getHTML();
      triggerSave();
    },
  });

  // Fetch document on mount
  useEffect(() => {
    documents
      .get(id)
      .then((d) => {
        setDoc(d);
        setTitle(d.title || '');
        titleRef.current = d.title || '';
        contentRef.current = d.content || '';

        // Set editor content once loaded
        if (editor) {
          editor.commands.setContent(d.content || '');
          const editable = d.owner_id === user?.id || d.accessLevel === 'editor';
          editor.setEditable(editable);
        }
      })
      .catch((err) => {
        console.error('Failed to load document:', err);
        setError(err.message || 'Document not found');
      })
      .finally(() => setLoading(false));
  }, [id, editor, user]);

  // Handle title changes
  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    titleRef.current = newTitle;
    triggerSave();
  };

  // Handle version restore
  const handleVersionRestore = (restoredDoc) => {
    setDoc(restoredDoc);
    setTitle(restoredDoc.title || '');
    titleRef.current = restoredDoc.title || '';
    contentRef.current = restoredDoc.content || '';
    if (editor) {
      editor.commands.setContent(restoredDoc.content || '');
    }
    setShowVersions(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="error-state">
        <div className="icon">😕</div>
        <h2>Can&apos;t open document</h2>
        <p>{error}</p>
        <button className="btn-primary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className={`editor-page ${!canEdit ? 'editor-readonly' : ''}`}>
      {/* Editor header */}
      <div className="editor-header">
        <div className="editor-header-left">
          <button className="editor-back-btn" onClick={() => navigate('/dashboard')}>
            ← Back
          </button>
          <input
            className="editor-title-input"
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled Document"
            disabled={!canEdit}
          />
        </div>

        <div className="editor-header-right">
          {/* Save status indicator */}
          {canEdit && (
            <div className={`save-status ${saveStatus}`}>
              <span className="save-status-dot" />
              {saveStatus === 'saved' && 'Saved'}
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'unsaved' && 'Unsaved'}
            </div>
          )}

          {/* Read-only badge */}
          {!canEdit && (
            <span className="readonly-banner">
              🔒 View Only
            </span>
          )}

          {/* Version history toggle */}
          <button
            className="btn-ghost"
            onClick={() => setShowVersions(!showVersions)}
            title="Version history"
          >
            🕐 History
          </button>

          {/* Share button — only for owner */}
          {isOwner && (
            <button
              className="btn-secondary"
              onClick={() => setShowShare(true)}
            >
              Share
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      {canEdit && <Toolbar editor={editor} />}

      {/* Editor content area */}
      <div className="editor-content-wrapper">
        <div className="editor-content">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Share dialog */}
      {showShare && (
        <ShareDialog
          docId={id}
          ownerId={doc.owner_id}
          ownerName={doc.owner?.display_name || user?.displayName}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* Version history panel */}
      {showVersions && (
        <VersionHistory
          docId={id}
          onRestore={handleVersionRestore}
          onClose={() => setShowVersions(false)}
        />
      )}
    </div>
  );
}
