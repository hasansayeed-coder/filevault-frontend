'use client';

import { useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fileApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  X, Clock, RotateCcw, Trash2, Upload,
  CheckCircle, Image, Video, Music, FileText, File,
} from 'lucide-react';

const FILE_TYPE_ICONS: Record<string, any> = {
  IMAGE: Image, VIDEO: Video, AUDIO: Music, PDF: FileText,
};
const FILE_TYPE_COLORS: Record<string, string> = {
  IMAGE: '#10b981', VIDEO: '#ef4444', AUDIO: '#f59e0b', PDF: '#3b82f6',
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

interface Props {
  file: any;
  onClose: () => void;
}

export default function VersionHistoryPanel({ file, onClose }: Props) {
  const qc        = useQueryClient();
  const uploadRef = useRef<HTMLInputElement>(null);

  const { data: versions, isLoading } = useQuery({
    queryKey: ['versions', file.id],
    queryFn: () => fileApi.getVersions(file.id).then(r => r.data.data),
    enabled: !!file,
  });

  const restoreMut = useMutation({
    mutationFn: (versionId: string) => fileApi.restoreVersion(file.id, versionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['versions', file.id] });
      qc.invalidateQueries({ queryKey: ['files'] });
      toast.success('Version restored successfully!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Restore failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (versionId: string) => fileApi.deleteVersion(file.id, versionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['versions', file.id] });
      toast.success('Version deleted');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Delete failed'),
  });

  const uploadMut = useMutation({
    mutationFn: (formData: FormData) => fileApi.uploadVersion(file.id, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['versions', file.id] });
      qc.invalidateQueries({ queryKey: ['files'] });
      toast.success('New version uploaded!');
      if (uploadRef.current) uploadRef.current.value = '';
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Upload failed'),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append('file', f);
    uploadMut.mutate(fd);
  };

  const Icon  = FILE_TYPE_ICONS[file.fileType]  || File;
  const color = FILE_TYPE_COLORS[file.fileType] || '#6366f1';

  const versionList = versions || [];

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 299, background: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />

      {/* Side panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 420, zIndex: 300,
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
        animation: 'slideInRight 0.2s ease',
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: `${color}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Clock size={16} color={color} />
            </div>
            <div>
              <h3 style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>
                Version History
              </h3>
              <p style={{ color: 'var(--text-subtle)', fontSize: '0.75rem', margin: 0 }}>
                {file.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8, border: 'none',
              background: 'var(--surface-2)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Upload new version button */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <input
            ref={uploadRef}
            type="file"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
            accept={file.mimeType}
          />
          <button
            onClick={() => uploadRef.current?.click()}
            disabled={uploadMut.isPending}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px', borderRadius: 10,
              background: `${color}15`,
              border: `1px dashed ${color}60`,
              color, fontWeight: 600, fontSize: '0.85rem',
              cursor: uploadMut.isPending ? 'not-allowed' : 'pointer',
              opacity: uploadMut.isPending ? 0.6 : 1,
              transition: 'all 0.15s',
            }}
          >
            <Upload size={15} />
            {uploadMut.isPending ? 'Uploading...' : 'Upload New Version'}
          </button>
          <p style={{ color: 'var(--text-subtle)', fontSize: '0.72rem', textAlign: 'center', marginTop: 6 }}>
            Must be the same file type ({file.mimeType})
          </p>
        </div>

        {/* Version list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>

          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{
                  height: 72, borderRadius: 10, background: 'var(--surface-2)',
                  opacity: 1 - i * 0.25,
                }} />
              ))}
            </div>
          )}

          {!isLoading && versionList.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <Clock size={40} style={{ color: 'var(--text-subtle)', margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-muted)', fontWeight: 500, marginBottom: 6 }}>
                No previous versions
              </p>
              <p style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>
                Upload a new version above to start tracking history
              </p>
            </div>
          )}

          {!isLoading && versionList.length > 0 && (
            <div>
              {/* Current version (top of timeline) */}
              <div style={{ marginBottom: 8 }}>
                <p style={{ color: 'var(--text-subtle)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Current Version
                </p>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 12,
                  background: `${color}10`,
                  border: `1px solid ${color}30`,
                }}>
                  {/* Timeline dot */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <CheckCircle size={18} color={color} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <p style={{
                        color: 'var(--text)', fontSize: '0.85rem', fontWeight: 600,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180,
                      }}>
                        {file.name}
                      </p>
                      <span style={{
                        background: `${color}20`, color,
                        fontSize: '0.65rem', fontWeight: 700, padding: '1px 7px', borderRadius: 999,
                      }}>
                        CURRENT
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span style={{ color: 'var(--text-subtle)', fontSize: '0.75rem' }}>
                        {formatBytes(file.size)}
                      </span>
                      <span style={{ color: 'var(--text-subtle)', fontSize: '0.75rem' }}>
                        {formatDistanceToNow(new Date(file.updatedAt || file.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Previous versions timeline */}
              <div style={{ marginTop: 20 }}>
                <p style={{ color: 'var(--text-subtle)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Previous Versions ({versionList.length})
                </p>

                {/* Timeline line */}
                <div style={{ position: 'relative' }}>
                  {/* Vertical line */}
                  <div style={{
                    position: 'absolute', left: 11, top: 12, bottom: 12,
                    width: 2, background: 'var(--border)', borderRadius: 999,
                    zIndex: 0,
                  }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {versionList.map((v: any, idx: number) => (
                      <div
                        key={v.id}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 12,
                          position: 'relative', zIndex: 1,
                        }}
                      >
                        {/* Timeline dot */}
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                          background: 'var(--surface-2)',
                          border: '2px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          marginTop: 12,
                        }}>
                          <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                            v{v.versionNumber}
                          </span>
                        </div>

                        {/* Version card */}
                        <div style={{
                          flex: 1,
                          padding: '10px 12px', borderRadius: 10,
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{
                                color: 'var(--text)', fontSize: '0.82rem', fontWeight: 500,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                marginBottom: 3,
                              }}>
                                {v.name}
                              </p>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <span style={{ color: 'var(--text-subtle)', fontSize: '0.72rem' }}>
                                  {formatBytes(v.size)}
                                </span>
                                <span style={{ color: 'var(--text-subtle)', fontSize: '0.72rem' }}>
                                  {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                              <button
                                title="Restore this version"
                                onClick={() => {
                                  if (confirm(`Restore version ${v.versionNumber}? The current version will be saved before restoring.`)) {
                                    restoreMut.mutate(v.id);
                                  }
                                }}
                                disabled={restoreMut.isPending}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  padding: '4px 10px', borderRadius: 6, border: 'none',
                                  background: 'rgba(99,102,241,0.1)', color: '#818cf8',
                                  fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                                }}
                              >
                                <RotateCcw size={11} /> Restore
                              </button>
                              <button
                                title="Delete this version"
                                onClick={() => {
                                  if (confirm('Delete this version? This cannot be undone.')) {
                                    deleteMut.mutate(v.id);
                                  }
                                }}
                                disabled={deleteMut.isPending}
                                style={{
                                  width: 26, height: 26, borderRadius: 6, border: 'none',
                                  background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                  cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px', borderTop: '1px solid var(--border)', flexShrink: 0,
          background: 'var(--surface-2)',
        }}>
          <p style={{ color: 'var(--text-subtle)', fontSize: '0.72rem', textAlign: 'center' }}>
            Restoring a version saves the current file as a new version first
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}