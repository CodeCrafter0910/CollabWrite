/**
 * Rich text toolbar for the TipTap editor.
 * Each button checks its active state via the editor API.
 */
export default function Toolbar({ editor }) {
  if (!editor) return null;

  // Helper to keep the JSX cleaner
  const ToolbarButton = ({ onClick, isActive, label, title }) => (
    <button
      className={`toolbar-btn ${isActive ? 'active' : ''}`}
      onClick={onClick}
      title={title || label}
      type="button"
    >
      {label}
    </button>
  );

  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Text formatting">
      {/* Inline formatting */}
      <div className="toolbar-group">
        <ToolbarButton
          label="B"
          title="Bold (Ctrl+B)"
          isActive={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label="I"
          title="Italic (Ctrl+I)"
          isActive={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          label="U"
          title="Underline (Ctrl+U)"
          isActive={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
      </div>

      <div className="toolbar-divider" />

      {/* Headings */}
      <div className="toolbar-group">
        <ToolbarButton
          label="H1"
          title="Heading 1"
          isActive={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        />
        <ToolbarButton
          label="H2"
          title="Heading 2"
          isActive={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          label="H3"
          title="Heading 3"
          isActive={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
        <ToolbarButton
          label="¶"
          title="Normal text"
          isActive={!editor.isActive('heading')}
          onClick={() => editor.chain().focus().setParagraph().run()}
        />
      </div>

      <div className="toolbar-divider" />

      {/* Lists */}
      <div className="toolbar-group">
        <ToolbarButton
          label="• List"
          title="Bullet list"
          isActive={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="1. List"
          title="Ordered list"
          isActive={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
      </div>
    </div>
  );
}
