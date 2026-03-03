'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Archive, Download, Eye, Lock,
  Clock, AlertTriangle, Loader2, FileText,
  Image, Video, Music, File,
} from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const FILE_TYPE_ICONS: Record<string, any> = {
  IMAGE: Image, VIDEO: Video, AUDIO: Music, PDF: FileText,
};
const FILE_TYPE_COLORS: Record<string, string> = {
  IMAGE: '#10b981', VIDEO: '#ef4444', AUDIO: '#f59e0b', PDF: '#3b82f6',
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SharePage() {
  const { token } = useParams() as { token: string };
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    axios.get(`${API_URL}/shares/public/${token}`)
      .then(r => {
        setFileInfo(r.data.data);
        if (!r.data.data.hasPassword) setUnlocked(true);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Share link not found or expired');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleUnlock = async () => {
    try {
      const url = `${API_URL}/shares/public/${token}/access?password=${encodeURIComponent(password)}&action=preview`;
      const res = await fetch(url);
      if (res.status === 401) {
        setPasswordError('Incorrect password. Please try again.');
        return;
      }
      if (res.ok) {
        setUnlocked(true);
        setPasswordError('');
      }
    } catch {
      setPasswordError('Failed to verify password');
    }
  };

  const handlePreview = async () => {
    setPreviewing(true);
    const url = `${API_URL}/shares/public/${token}/access?${
      fileInfo.hasPassword ? `password=${encodeURIComponent(password)}&` : ''
    }action=preview`;

    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
    } catch {
      toast('Failed to load preview');
    } finally {
      setPreviewing(false);
    }
  };

  const handleDownload = () => {
    const url = `${API_URL}/shares/public/${token}/access?${
      fileInfo.hasPassword ? `password=${encodeURIComponent(password)}&` : ''
    }action=download`;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileInfo.fileName;
    a.click();
  };

  const Icon = fileInfo ? (FILE_TYPE_ICONS[fileInfo.fileType] || File) : File;
  const color = fileInfo ? (FILE_TYPE_COLORS[fileInfo.fileType] || '#6366f1') : '#6366f1';

  return (
    <div style={{
      minHeight: '100vh', background: '#0f0f17',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'Inter, sans-serif',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: '#6366f1', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Archive size={20} color="white" />
        </div>
        <span style={{ color: 'white', fontSize: '1.25rem', fontWeight: 700 }}>FileVault</span>
      </div>

      <div style={{
        width: '100%', maxWidth: 460,
        background: '#1a1a2e', borderRadius: 20,
        border: '1px solid #2d2d3d', padding: 32,
      }}>
        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <Loader2 size={36} color="#6366f1" style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
            <p style={{ color: '#94a3b8' }}>Loading shared file...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: 16 }} />
            <h2 style={{ color: 'white', marginBottom: 8 }}>Link Unavailable</h2>
            <p style={{ color: '#94a3b8' }}>{error}</p>
          </div>
        )}

        {/* File info */}
        {!loading && fileInfo && (
          <>
            {/* File card */}
            <div style={{
              background: '#0f0f17', borderRadius: 12,
              border: `1px solid ${color}40`, padding: 20,
              display: 'flex', alignItems: 'center', gap: 16,
              marginBottom: 24,
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 12,
                background: `${color}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={24} color={color} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{
                  color: 'white', fontWeight: 600, fontSize: '1rem',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {fileInfo.fileName}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <span style={{
                    background: `${color}20`, color, fontSize: '0.7rem',
                    padding: '2px 8px', borderRadius: 999, fontWeight: 600,
                  }}>
                    {fileInfo.fileType}
                  </span>
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                    {formatBytes(fileInfo.size)}
                  </span>
                  {fileInfo.expiresAt && (
                    <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} />
                      Expires {format(new Date(fileInfo.expiresAt), 'MMM d, h:mm a')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Password gate */}
            {fileInfo.hasPassword && !unlocked && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Lock size={16} color="#f59e0b" />
                  <p style={{ color: '#f59e0b', fontSize: '0.875rem', fontWeight: 500 }}>
                    This file is password protected
                  </p>
                </div>
                <input
                  type="password"
                  placeholder="Enter password to access"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPasswordError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                  style={{
                    width: '100%', padding: '12px 14px',
                    background: '#0f0f17', border: `1px solid ${passwordError ? '#ef4444' : '#2d2d3d'}`,
                    borderRadius: 8, color: 'white', fontSize: '0.9rem',
                    outline: 'none', boxSizing: 'border-box', marginBottom: 8,
                  }}
                />
                {passwordError && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: 8 }}>{passwordError}</p>
                )}
                <button
                  onClick={handleUnlock}
                  style={{
                    width: '100%', padding: '12px',
                    background: '#6366f1', border: 'none',
                    borderRadius: 8, color: 'white',
                    fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Unlock File
                </button>
              </div>
            )}

            {/* Actions (shown when unlocked) */}
            {unlocked && (
              <>
                {/* Preview */}
                {previewUrl && (
                  <div style={{
                    marginBottom: 20, borderRadius: 12,
                    overflow: 'hidden', border: '1px solid #2d2d3d',
                    background: '#0f0f17',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minHeight: 200,
                  }}>
                    {fileInfo.fileType === 'IMAGE' && (
                      <img src={previewUrl} alt={fileInfo.fileName}
                        style={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain' }} />
                    )}
                    {fileInfo.fileType === 'VIDEO' && (
                      <video controls style={{ width: '100%', maxHeight: 350 }}>
                        <source src={previewUrl} type={fileInfo.mimeType} />
                      </video>
                    )}
                    {fileInfo.fileType === 'AUDIO' && (
                      <div style={{ padding: 32, textAlign: 'center' }}>
                        <Music size={48} color="#f59e0b" style={{ marginBottom: 16 }} />
                        <audio controls style={{ width: '100%' }}>
                          <source src={previewUrl} type={fileInfo.mimeType} />
                        </audio>
                      </div>
                    )}
                    {fileInfo.fileType === 'PDF' && (
                      <div style={{ padding: 32, textAlign: 'center' }}>
                        <FileText size={48} color="#3b82f6" style={{ marginBottom: 16 }} />
                        <p style={{ color: '#94a3b8', marginBottom: 16 }}>PDF ready to view</p>
                        <button
                          onClick={() => window.open(previewUrl, '_blank')}
                          style={{
                            background: '#3b82f6', border: 'none', borderRadius: 8,
                            padding: '10px 24px', color: 'white', cursor: 'pointer', fontWeight: 600,
                          }}
                        >
                          Open PDF
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  {!previewUrl && (
                    <button
                      onClick={handlePreview}
                      disabled={previewing}
                      style={{
                        flex: 1, padding: '12px', borderRadius: 8,
                        background: 'rgba(99,102,241,0.15)',
                        border: '1px solid rgba(99,102,241,0.3)',
                        color: '#818cf8', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        fontSize: '0.9rem', fontWeight: 600,
                      }}
                    >
                      {previewing
                        ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Loading...</>
                        : <><Eye size={15} /> Preview</>
                      }
                    </button>
                  )}
                  <button
                    onClick={handleDownload}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 8,
                      background: '#6366f1', border: 'none',
                      color: 'white', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      fontSize: '0.9rem', fontWeight: 600,
                    }}
                  >
                    <Download size={15} /> Download
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <p style={{ color: '#334155', fontSize: '0.8rem', marginTop: 24 }}>
        Powered by FileVault · Secure file sharing
      </p>
    </div>
  );
}