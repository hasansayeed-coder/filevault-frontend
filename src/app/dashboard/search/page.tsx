'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fileApi } from '@/lib/api';
import AuthGuard from '@/components/layout/AuthGuard';
import AppLayout from '@/components/layout/AppLayout';
import FilePreviewModal from '@/components/files/FilePreviewModal';
import ShareModal from '@/components/files/ShareModal';
import { formatDistanceToNow } from 'date-fns';
import {
  Search, Image, Video, Music, FileText, File,
  SortAsc, SortDesc, Filter, X, FolderOpen,
  Download, Eye, Share2, Clock, HardDrive,
} from 'lucide-react';

const FILE_TYPE_ICONS: Record<string, any> = {
  IMAGE: Image, VIDEO: Video, AUDIO: Music, PDF: FileText,
};
const FILE_TYPE_COLORS: Record<string, string> = {
  IMAGE: '#10b981', VIDEO: '#ef4444', AUDIO: '#f59e0b', PDF: '#3b82f6',
};
const FILE_TYPE_OPTIONS = [
  { value: '',      label: 'All Types', color: '#6366f1' },
  { value: 'IMAGE', label: 'Images',    color: '#10b981' },
  { value: 'VIDEO', label: 'Videos',    color: '#ef4444' },
  { value: 'AUDIO', label: 'Audio',     color: '#f59e0b' },
  { value: 'PDF',   label: 'PDFs',      color: '#3b82f6' },
];
const SORT_OPTIONS = [
  { value: 'date_desc',  label: 'Newest First' },
  { value: 'date_asc',   label: 'Oldest First' },
  { value: 'name_asc',   label: 'Name A→Z'     },
  { value: 'name_desc',  label: 'Name Z→A'     },
  { value: 'size_desc',  label: 'Largest First' },
  { value: 'size_asc',   label: 'Smallest First'},
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SearchPage() {
  const [search, setSearch]         = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [fileType, setFileType]     = useState('');
  const [sortBy, setSortBy]         = useState('date_desc');
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [shareFile, setShareFile]   = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Auto-focus search on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const { data: files, isLoading } = useQuery({
    queryKey: ['search-files', debouncedSearch, fileType],
    queryFn: () => fileApi.getAll({
      search: debouncedSearch || undefined,
      fileType: fileType || undefined,
    }).then(r => r.data.data),
  });

  // Client-side sort
  const sorted = [...(files || [])].sort((a: any, b: any) => {
    switch (sortBy) {
      case 'date_desc':  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'date_asc':   return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'name_asc':   return a.name.localeCompare(b.name);
      case 'name_desc':  return b.name.localeCompare(a.name);
      case 'size_desc':  return b.size - a.size;
      case 'size_asc':   return a.size - b.size;
      default:           return 0;
    }
  });

  const handleDownload = (file: any) => {
    const token = localStorage.getItem('accessToken');
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/files/${file.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = file.originalName;
        a.click();
      });
  };

  const hasFilters = !!debouncedSearch || !!fileType || sortBy !== 'date_desc';

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-8 max-w-5xl">

          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>
              Search & Filter
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Search across all your files and folders
            </p>
          </div>

          {/* Search bar */}
          <div className="relative mb-5">
            <Search
              size={18}
              style={{
                position: 'absolute', left: 16, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-subtle)',
                pointerEvents: 'none',
              }}
            />
            <input
              ref={inputRef}
              className="input"
              style={{
                width: '100%', paddingLeft: 48, paddingRight: search ? 44 : 16,
                paddingTop: 14, paddingBottom: 14,
                fontSize: '1rem', boxSizing: 'border-box',
              }}
              placeholder="Search by file name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute', right: 14, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', display: 'flex',
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filter row */}
          <div style={{
            display: 'flex', gap: 12, marginBottom: 24,
            flexWrap: 'wrap', alignItems: 'center',
          }}>
            {/* File type filter */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {FILE_TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFileType(opt.value)}
                  style={{
                    padding: '6px 14px', borderRadius: 999, cursor: 'pointer',
                    fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.15s',
                    border: `2px solid ${fileType === opt.value ? opt.color : 'var(--border)'}`,
                    background: fileType === opt.value ? `${opt.color}20` : 'transparent',
                    color: fileType === opt.value ? opt.color : 'var(--text-muted)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Sort dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {sortBy.includes('asc') ? (
                <SortAsc size={15} style={{ color: 'var(--text-muted)' }} />
              ) : (
                <SortDesc size={15} style={{ color: 'var(--text-muted)' }} />
              )}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8, padding: '7px 12px',
                  color: 'var(--text)', fontSize: '0.8rem',
                  cursor: 'pointer', outline: 'none',
                }}
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Clear filters */}
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setFileType(''); setSortBy('date_desc'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 12px', borderRadius: 8,
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#ef4444', fontSize: '0.8rem',
                  cursor: 'pointer', fontWeight: 500,
                }}
              >
                <X size={13} /> Clear
              </button>
            )}
          </div>

          {/* Results summary */}
          {!isLoading && (
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>
                {sorted.length === 0
                  ? 'No files found'
                  : `${sorted.length} file${sorted.length !== 1 ? 's' : ''} found`}
              </p>
              {debouncedSearch && (
                <span style={{
                  background: 'rgba(99,102,241,0.15)',
                  color: '#818cf8', fontSize: '0.75rem',
                  padding: '2px 8px', borderRadius: 999, fontWeight: 600,
                }}>
                  "{debouncedSearch}"
                </span>
              )}
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  style={{
                    height: 68, borderRadius: 12,
                    background: 'var(--surface-2)',
                    animation: 'pulse 1.5s infinite',
                    opacity: 1 - i * 0.15,
                  }}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && sorted.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'var(--surface-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <Search size={28} style={{ color: 'var(--text-subtle)' }} />
              </div>
              <p style={{ color: 'var(--text-muted)', fontWeight: 500, marginBottom: 6 }}>
                {debouncedSearch || fileType ? 'No files match your search' : 'No files uploaded yet'}
              </p>
              <p style={{ color: 'var(--text-subtle)', fontSize: '0.875rem' }}>
                {debouncedSearch || fileType
                  ? 'Try adjusting your search or filters'
                  : 'Upload files to a folder to see them here'}
              </p>
            </div>
          )}

          {/* File list */}
          {!isLoading && sorted.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sorted.map((file: any) => {
                const Icon = FILE_TYPE_ICONS[file.fileType] || File;
                const color = FILE_TYPE_COLORS[file.fileType] || '#6366f1';
                return (
                  <div
                    key={file.id}
                    className="card"
                    style={{
                      padding: '12px 16px',
                      display: 'flex', alignItems: 'center', gap: 14,
                      cursor: 'pointer', transition: 'border-color 0.15s',
                    }}
                    onClick={() => setPreviewFile(file)}
                    onMouseOver={e => (e.currentTarget.style.borderColor = color)}
                    onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: `${color}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={18} color={color} />
                    </div>

                    {/* File info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        color: 'var(--text)', fontWeight: 500, fontSize: '0.9rem',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        marginBottom: 3,
                      }}>
                        {file.name}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {/* Folder path */}
                        {file.folder && (
                          <span style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            color: 'var(--text-subtle)', fontSize: '0.75rem',
                          }}>
                            <FolderOpen size={11} />
                            {file.folder.name}
                          </span>
                        )}
                        {/* Size */}
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          color: 'var(--text-subtle)', fontSize: '0.75rem',
                        }}>
                          <HardDrive size={11} />
                          {formatBytes(file.size)}
                        </span>
                        {/* Date */}
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          color: 'var(--text-subtle)', fontSize: '0.75rem',
                        }}>
                          <Clock size={11} />
                          {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    {/* Type badge */}
                    <span style={{
                      background: `${color}20`, color,
                      fontSize: '0.7rem', fontWeight: 700,
                      padding: '3px 9px', borderRadius: 999, flexShrink: 0,
                    }}>
                      {file.fileType}
                    </span>

                    {/* Action buttons */}
                    <div
                      style={{ display: 'flex', gap: 4, flexShrink: 0 }}
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        title="Preview"
                        onClick={() => setPreviewFile(file)}
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: 'var(--surface-2)', border: 'none',
                          cursor: 'pointer', color: 'var(--text-muted)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        title="Share"
                        onClick={() => setShareFile(file)}
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: 'var(--surface-2)', border: 'none',
                          cursor: 'pointer', color: 'var(--text-muted)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Share2 size={14} />
                      </button>
                      <button
                        title="Download"
                        onClick={() => handleDownload(file)}
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: 'var(--surface-2)', border: 'none',
                          cursor: 'pointer', color: 'var(--text-muted)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modals */}
        <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
        <ShareModal isOpen={!!shareFile} onClose={() => setShareFile(null)} file={shareFile} />

      </AppLayout>
    </AuthGuard>
  );
}