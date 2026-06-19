import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { upload } from '../utils/api';
import toast from 'react-hot-toast';

const ALLOWED_TYPES = ['.txt', '.md', '.docx'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export default function UploadDialog({ onClose }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // null | 'uploading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const validateFile = (file) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_TYPES.includes(ext)) {
      return `Unsupported file type: ${ext}. Please use ${ALLOWED_TYPES.join(', ')}`;
    }
    if (file.size > MAX_SIZE) {
      return 'File is too large. Maximum size is 5MB.';
    }
    return null;
  };

  const handleUpload = async (file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setUploadStatus('error');
      setErrorMessage(validationError);
      return;
    }

    setUploadStatus('uploading');
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const data = await upload.file(formData);
      setUploadStatus('success');
      toast.success('File uploaded successfully!');

      // Navigate to the newly created document after a brief pause
      setTimeout(() => {
        onClose();
        if (data?.id) {
          navigate(`/editor/${data.id}`);
        }
      }, 800);
    } catch (err) {
      setUploadStatus('error');
      setErrorMessage(err.message || 'Upload failed');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) handleUpload(file);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Upload File</h2>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div
            className={`upload-dropzone ${dragOver ? 'dragover' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="icon">📄</div>
            <p>Drop a file here, or click to browse</p>
            <p className="hint">
              Supported: {ALLOWED_TYPES.join(', ')} · Max 5MB
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {uploadStatus && (
            <div className={`upload-status ${uploadStatus}`}>
              {uploadStatus === 'uploading' && (
                <>
                  <div className="spinner" /> Uploading...
                </>
              )}
              {uploadStatus === 'success' && '✓ Uploaded! Redirecting...'}
              {uploadStatus === 'error' && `✗ ${errorMessage}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
