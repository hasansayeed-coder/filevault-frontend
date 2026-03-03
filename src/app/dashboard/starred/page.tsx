'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { fileApi, folderApi } from '@/lib/api';
import AuthGuard from '@/components/layout/AuthGuard';
import AppLayout from '@/components/layout/AppLayout';
import FilePreviewModal from '@/components/files/FilePreviewModal';
import ShareModal from '@/components/files/ShareModal';
import VersionHistoryPanel from '@/components/files/VersionHistoryPanel';
import {
  Star, FolderOpen, File, Image, Video, Music, FileText,
  Download, Eye, Share2, Clock, Trash2, ExternalLink,
  Search, X,
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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function StarredPage() {
  const qc     = useQueryClient();
  const router = useRouter();

  const [previewFile, setPreviewFile]   = useState<any>(null);
  const [shareFile, setShareFile]       = useState<any>(null);
  const [versionFile, setVersionFile]   = useState<any>(null);
  const [search, setSearch]             = useState('');
  const [activeTab, setActiveTab]       = useState<'all' | 'files' | 'folders'>('all');

  // ── Fetch starred items ──
  const { data: starredFiles, isLoading: filesLoading } = useQuery({
    queryKey: ['starred', 'files'],
    queryFn: () => fileApi.getStarred().then(r => r.data.data),
  });

  const { data: starredFolders, isLoading: foldersLoading } = useQuery({
    queryKey: ['starred', 'folders'],
    queryFn: () => folderApi.getStarred().then(r => r.data.data),
  });

  // ── Unstar mutations ──
  const unstarFileMut = useMutation({
    mutationFn: (id: string) => fileApi.toggleStar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['starred'] });
      qc.invalidateQueries({ queryKey: ['files'] });
      toast('Removed from Starred', { duration: 1800 });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const unstarFolderMut = useMutation({
    mutationFn: (id: string) => folderApi.toggleStar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['starred'] });
      qc.invalidateQueries({ queryKey: ['folders'] });
      toast('Removed from Starred', { duration: 1800 });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const handleDownload = (file: any) => {
    const token = localStorage.getItem('accessToken');
    fetch(fileApi.getDownloadUrl(file.id), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob()).then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = file.originalName;
        a.click();
      });
  };

  const handleOpenFolder = (folderId: string) => {
    router.push(`/dashboard/files?folder=${folderId}`);
  };

  // ── Filter by search + tab ──
  const filteredFiles = (starredFiles || []).filter((f: any) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredFolders = (starredFolders || []).filter((f: any) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const showFiles   = activeTab === 'all' || activeTab === 'files';
  const showFolders = activeTab === 'all' || activeTab === 'folders';
  const totalCount  = (starredFiles?.length || 0) + (starredFolders?.length || 0);
  const isLoading   = filesLoading || foldersLoading;
  const isEmpty     = !isLoading && filteredFiles.length === 0 && filteredFolders.length === 0;

  return (
    <AuthGuard>
      <AppLayout>
        <div className="h-full flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-8 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Star size={18} color="#f59e0b" fill="#f59e0b" />
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Starred</h1>
                <p style={{ color: 'var(--text-subtle)', fontSize: '0.78rem', marginTop: 1 }}>
                  {totalCount} starred item{totalCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-subtle)' }} />
              <input
                className="input pl-8 py-2"
                style={{ width: 200, fontSize: '0.8125rem' }}
                placeholder="Search starred..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ padding: '12px 32px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 4 }}>
            {(['all', 'files', 'folders'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '7px 16px', borderRadius: '8px 8px 0 0',
                  background: activeTab === tab ? 'var(--surface-2)' : 'none',
                  border: activeTab === tab ? '1px solid var(--border)' : '1px solid transparent',
                  borderBottom: activeTab === tab ? '1px solid var(--surface-2)' : '1px solid transparent',
                  marginBottom: activeTab === tab ? -1 : 0,
                  color: activeTab === tab ? 'var(--text)' : 'var(--text-muted)',
                  fontSize: '0.82rem', fontWeight: activeTab === tab ? 600 : 400,
                  cursor: 'pointer', textTransform: 'capitalize',
                }}
              >
                {tab === 'all' ? `All (${totalCount})` : tab === 'files' ? `Files (${starredFiles?.length || 0})` : `Folders (${starredFolders?.length || 0})`}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-8">

            {/* Loading */}
            {isLoading && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} style={{ height: 80, borderRadius: 12, background: 'var(--surface-2)', opacity: 1 - i * 0.1 }} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {isEmpty && !isLoading && (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Star size={28} color="#f59e0b" />
                </div>
                <p style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '1rem', marginBottom: 8 }}>
                  {search ? 'No starred items match your search' : 'No starred items yet'}
                </p>
                <p style={{ color: 'var(--text-subtle)', fontSize: '0.875rem', maxWidth: 340, margin: '0 auto' }}>
                  {search
                    ? 'Try a different search term'
                    : 'Hover over any file or folder and click the ⭐ to star it for quick access here'}
                </p>
              </div>
            )}

            {/* Starred Folders */}
            {showFolders && filteredFolders.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: 12 }}>
                  Starred Folders ({filteredFolders.length})
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                  {filteredFolders.map((folder: any) => (
                    <div
                      key={folder.id}
                      className="card group"
                      style={{ padding: '12px 14px', cursor: 'pointer', borderColor: 'rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.03)' }}
                      onDoubleClick={() => handleOpenFolder(folder.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                          <FolderOpen size={24} color="#f59e0b" />
                          <div style={{ minWidth: 0 }}>
                            <p style={{ color: 'var(--text)', fontSize: '0.875rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {folder.name}
                            </p>
                            <p style={{ color: 'var(--text-subtle)', fontSize: '0.72rem', marginTop: 2 }}>
                              {folder._count?.files || 0} files · {formatDate(folder.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0, opacity: 0 }} className="group-hover:opacity-100">
                          <button
                            title="Open folder"
                            onClick={(e) => { e.stopPropagation(); router.push('/dashboard/files'); }}
                            style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--surface-2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
                          >
                            <ExternalLink size={12} />
                          </button>
                          <button
                            title="Unstar"
                            onClick={(e) => { e.stopPropagation(); unstarFolderMut.mutate(folder.id); }}
                            style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(245,158,11,0.12)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Star size={12} color="#f59e0b" fill="#f59e0b" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Starred Files */}
            {showFiles && filteredFiles.length > 0 && (
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: 12 }}>
                  Starred Files ({filteredFiles.length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {filteredFiles.map((file: any) => {
                    const Icon  = FILE_TYPE_ICONS[file.fileType]  || File;
                    const color = FILE_TYPE_COLORS[file.fileType] || '#6366f1';
                    return (
                      <div
                        key={file.id}
                        className="card group"
                        style={{ padding: '10px 14px', cursor: 'pointer', borderColor: 'rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.02)' }}
                        onClick={() => setPreviewFile(file)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {/* Icon */}
                          <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={16} color={color} />
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: 'var(--text)', fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {file.name}
                            </p>
                            <div style={{ display: 'flex', gap: 10, marginTop: 2, alignItems: 'center' }}>
                              <span style={{ fontSize: '0.7rem', color, background: `${color}15`, padding: '1px 7px', borderRadius: 999, fontWeight: 600 }}>
                                {file.fileType}
                              </span>
                              <span style={{ color: 'var(--text-subtle)', fontSize: '0.72rem' }}>{formatBytes(file.size)}</span>
                              {file.folder && (
                                <span style={{ color: 'var(--text-subtle)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <FolderOpen size={10} /> {file.folder.name}
                                </span>
                              )}
                              <span style={{ color: 'var(--text-subtle)', fontSize: '0.72rem', marginLeft: 'auto' }}>
                                {formatDate(file.updatedAt || file.createdAt)}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0, opacity: 0 }} className="group-hover:opacity-100" onClick={e => e.stopPropagation()}>
                            <button title="Preview" onClick={() => setPreviewFile(file)} style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--surface-2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                              <Eye size={13} />
                            </button>
                            <button title="Version History" onClick={() => setVersionFile(file)} style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--surface-2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                              <Clock size={13} />
                            </button>
                            <button title="Share" onClick={() => setShareFile(file)} style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--surface-2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                              <Share2 size={13} />
                            </button>
                            <button title="Download" onClick={() => handleDownload(file)} style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--surface-2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                              <Download size={13} />
                            </button>
                            <button
                              title="Unstar"
                              onClick={() => unstarFileMut.mutate(file.id)}
                              style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(245,158,11,0.12)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Star size={13} color="#f59e0b" fill="#f59e0b" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
        <ShareModal isOpen={!!shareFile} onClose={() => setShareFile(null)} file={shareFile} />
        {versionFile && <VersionHistoryPanel file={versionFile} onClose={() => setVersionFile(null)} />}

      </AppLayout>
    </AuthGuard>
  );
}