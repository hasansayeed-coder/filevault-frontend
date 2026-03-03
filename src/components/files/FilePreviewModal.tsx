'use client';

import { useState, useEffect, useRef } from 'react';
import { Download, X, Music, FileText, Loader2 } from 'lucide-react';

interface FileItem {
  id: string;
  name: string;
  originalName: string;
  fileType: string;
  mimeType: string;
  size: number;
}

interface FilePreviewModalProps {
  file: FileItem | null;
  onClose: () => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const blobRef = useRef<string | null>(null);

  useEffect(() => {
    if (!file) return;

    setBlobUrl(null);
    setError(false);
    setLoading(true);

    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }

    const token = localStorage.getItem('accessToken');

    fetch(`${API_URL}/files/${file.id}/preview`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.blob();
      })
      .then((blob) => {
        // For PDF use a new blob with explicit type
        const typed = new Blob([blob], { type: file.mimeType });
        const url = URL.createObjectURL(typed);
        blobRef.current = url;
        setBlobUrl(url);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Preview error:', err);
        setError(true);
        setLoading(false);
      });

    return () => {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, [file?.id]);

  const handleDownload = () => {
    const token = localStorage.getItem('accessToken');
    fetch(`${API_URL}/files/${file!.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = file!.originalName;
        a.click();
      });
  };

  if (!file) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 860,
          maxHeight: '92vh', overflow: 'auto',
          background: 'var(--surface)',
          borderRadius: 16, padding: 24,
          border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {file.name}
            </p>
            <p style={{ color: 'var(--text-subtle)', fontSize: '0.75rem', marginTop: 2 }}>
              {formatBytes(file.size)} · {file.mimeType}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', marginLeft: 12, flexShrink: 0 }}>
            <X size={20} />
          </button>
        </div>

        {/* Preview */}
        <div style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          minHeight: 320,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <Loader2 size={36} color="#6366f1" style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
              <p style={{ color: 'var(--text-muted)' }}>Loading preview...</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <FileText size={44} style={{ color: 'var(--text-subtle)', marginBottom: 12 }} />
              <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Failed to load preview</p>
              <button className="btn-primary" style={{ padding: '8px 20px' }} onClick={handleDownload}>
                Download instead
              </button>
            </div>
          )}

          {/* IMAGE */}
          {!loading && !error && blobUrl && file.fileType === 'IMAGE' && (
            <img
              src={blobUrl}
              alt={file.name}
              style={{ maxWidth: '100%', maxHeight: 560, objectFit: 'contain', display: 'block' }}
              onError={() => setError(true)}
            />
          )}

          {/* VIDEO */}
          {!loading && !error && blobUrl && file.fileType === 'VIDEO' && (
            <video controls style={{ width: '100%', maxHeight: 520, display: 'block' }}>
              <source src={blobUrl} type={file.mimeType} />
            </video>
          )}

          {/* AUDIO */}
          {!loading && !error && blobUrl && file.fileType === 'AUDIO' && (
            <div style={{ textAlign: 'center', padding: 48, width: '100%' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'rgba(245,158,11,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <Music size={36} color="#f59e0b" />
              </div>
              <p style={{ color: 'var(--text)', fontWeight: 500, marginBottom: 20 }}>{file.name}</p>
              <audio controls style={{ width: '100%', maxWidth: 420 }}>
                <source src={blobUrl} type={file.mimeType} />
              </audio>
            </div>
          )}

          {/* PDF — open in new tab instead of iframe */}
          {!loading && !error && blobUrl && file.fileType === 'PDF' && (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <FileText size={56} color="#3b82f6" style={{ marginBottom: 16 }} />
              <p style={{ color: 'var(--text)', fontWeight: 500, marginBottom: 8 }}>{file.name}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
                PDF preview opens in a new tab
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  className="btn-primary"
                  style={{ padding: '10px 24px' }}
                  onClick={() => window.open(blobUrl, '_blank')}
                >
                  Open PDF
                </button>
                <button
                  className="btn-ghost"
                  style={{ padding: '10px 24px' }}
                  onClick={handleDownload}
                >
                  <Download size={14} style={{ marginRight: 6 }} />
                  Download
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`badge-${file.fileType.toLowerCase()}`} style={{ fontSize: '0.75rem', padding: '2px 10px', borderRadius: 999, fontWeight: 600 }}>
              {file.fileType}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {formatBytes(file.size)}
            </span>
          </div>
          <button
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px' }}
            onClick={handleDownload}
          >
            <Download size={14} />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}