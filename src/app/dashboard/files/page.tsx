'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { folderApi, fileApi } from '@/lib/api';
import AuthGuard from '@/components/layout/AuthGuard';
import AppLayout from '@/components/layout/AppLayout';
import FilePreviewModal from '@/components/files/FilePreviewModal';
import ShareModal from '@/components/files/ShareModal';
import VersionHistoryPanel from '@/components/files/VersionHistoryPanel';

import {
  FolderOpen, Folder, File, Upload, Plus, ChevronRight,
  MoreVertical, Pencil, Trash2, Download, Eye, Image,
  Video, Music, FileText, Search, Share2, Move,
  CheckSquare, Square, X, FolderInput, Clock, Star,
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

function ContextMenu({ items, onClose }: { items: any[]; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="context-menu absolute z-50" style={{ top: '100%', right: 0, marginTop: 4 }}>
        {items.map((item, i) => (
          <div
            key={i}
            className={`context-menu-item ${item.danger ? 'danger' : ''}`}
            onClick={() => { item.action(); onClose(); }}
          >
            {item.icon && <item.icon size={14} />}
            {item.label}
          </div>
        ))}
      </div>
    </>
  );
}

function StarButton({ starred, onClick }: { starred: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      title={starred ? 'Unstar' : 'Star'}
      style={{
        position: 'absolute', top: 6, right: 6,
        width: 22, height: 22, borderRadius: 5,
        background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: starred ? 1 : 0,
        transition: 'opacity 0.15s, transform 0.15s',
        zIndex: 10, padding: 0,
      }}
      className="star-btn"
    >
      <Star size={13} color={starred ? '#f59e0b' : 'var(--text-muted)'} fill={starred ? '#f59e0b' : 'none'} />
    </button>
  );
}

function BulkToolbar({ count, total, allSelected, onSelectAll, onClearAll, onDownload, onDelete, onMove, onExit, isDeleting, isMoving }: any) {
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      zIndex: 200, display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 16, padding: '10px 16px',
      boxShadow: '0 8px 40px rgba(0,0,0,0.5)', minWidth: 480,
    }}>
      <div style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', borderRadius: 999, padding: '3px 12px', fontSize: '0.82rem', fontWeight: 700, flexShrink: 0 }}>
        {count} selected
      </div>
      <button onClick={allSelected ? onClearAll : onSelectAll} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '4px 8px', borderRadius: 6 }}>
        {allSelected ? <><Square size={13} /> Deselect all</> : <><CheckSquare size={13} color="#6366f1" /> Select all ({total})</>}
      </button>
      <div style={{ flex: 1 }} />
      <button onClick={onDownload} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
        <Download size={13} /> Download
      </button>
      <button onClick={onMove} disabled={isMoving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8', fontSize: '0.82rem', fontWeight: 600, cursor: isMoving ? 'not-allowed' : 'pointer', opacity: isMoving ? 0.6 : 1 }}>
        <FolderInput size={13} /> {isMoving ? 'Moving...' : 'Move to'}
      </button>
      <button onClick={onDelete} disabled={isDeleting} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: '0.82rem', fontWeight: 600, cursor: isDeleting ? 'not-allowed' : 'pointer', opacity: isDeleting ? 0.6 : 1 }}>
        <Trash2 size={13} /> {isDeleting ? 'Deleting...' : 'Delete'}
      </button>
      <button onClick={onExit} style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
        <X size={14} />
      </button>
    </div>
  );
}

function MoveModal({ allFolders, currentFolderId, selectedCount, onMove, onClose, isMoving }: any) {
  const [targetId, setTargetId] = useState<string>('');
  const available = (allFolders || []).filter((f: any) => f.id !== currentFolderId);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 className="font-semibold text-lg" style={{ color: 'var(--text)' }}>Move {selectedCount} file{selectedCount !== 1 ? 's' : ''} to…</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        {available.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-subtle)', fontSize: '0.875rem' }}>No other folders available.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto', marginBottom: 20 }}>
            {available.map((folder: any) => (
              <div key={folder.id} onClick={() => setTargetId(folder.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', background: targetId === folder.id ? 'rgba(99,102,241,0.12)' : 'var(--surface-2)', border: `1px solid ${targetId === folder.id ? '#6366f1' : 'transparent'}` }}>
                <FolderOpen size={14} color={targetId === folder.id ? '#6366f1' : '#f59e0b'} />
                <span style={{ color: 'var(--text)', fontSize: '0.875rem', fontWeight: 500 }}>{folder.name}</span>
                {targetId === folder.id && <CheckSquare size={15} color="#6366f1" style={{ marginLeft: 'auto' }} />}
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!targetId || isMoving} onClick={() => targetId && onMove(targetId)} style={{ opacity: !targetId ? 0.5 : 1 }}>
            {isMoving ? 'Moving...' : 'Move here'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FolderCard({ folder, onOpen, onRename, onDelete, onDrop, isDragOver, onStar }: any) {
  const [menuOpen, setMenuOpen] = useState(false);
  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; onDrop?.onDragOver(folder.id); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); onDrop?.onDragLeave(); };
  const handleDrop      = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); const data = e.dataTransfer.getData('application/json'); if (data) { const { fileIds } = JSON.parse(data); onDrop?.onDrop(folder.id, fileIds); } };

  return (
    <div
      className="card p-3 cursor-pointer transition-all group relative folder-card"
      style={{ borderColor: isDragOver ? '#6366f1' : 'var(--border)', background: isDragOver ? 'rgba(99,102,241,0.08)' : undefined, transform: isDragOver ? 'scale(1.02)' : undefined, boxShadow: isDragOver ? '0 0 0 2px rgba(99,102,241,0.3)' : undefined }}
      onDoubleClick={() => onOpen(folder.id)}
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
    >
      <StarButton starred={folder.isStarred} onClick={(e) => { e.stopPropagation(); onStar(folder.id); }} />
      {isDragOver && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: 10, zIndex: 5, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(99,102,241,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#6366f1', color: 'white', padding: '4px 12px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700 }}>
            <Move size={12} /> Move here
          </div>
        </div>
      )}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5 flex-1 min-w-0" onClick={() => onOpen(folder.id)}>
          <FolderOpen size={28} color={isDragOver ? '#6366f1' : '#f59e0b'} />
          <div className="min-w-0">
            <p className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>{folder.name}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-subtle)' }}>{folder._count?.subfolders || 0} folders · {folder._count?.files || 0} files</p>
          </div>
        </div>
        <div className="relative" style={{ flexShrink: 0, marginRight: 18 }}>
          <button className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}>
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <ContextMenu onClose={() => setMenuOpen(false)} items={[
              { icon: Star,   label: folder.isStarred ? 'Unstar' : 'Star', action: () => onStar(folder.id) },
              { icon: Pencil, label: 'Rename', action: () => onRename(folder) },
              { icon: Trash2, label: 'Delete', danger: true, action: () => onDelete(folder.id) },
            ]} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── FileCard — added onComments prop + Comments menu item ─────────────────────
function FileCard({ file, onRename, onDelete, onDownload, onPreview, onShare, onVersions, onStar, isDragging, onDragStart, onDragEnd, selectionMode, selected, onToggleSelect }: any) {
  const [menuOpen, setMenuOpen] = useState(false);
  const Icon  = FILE_TYPE_ICONS[file.fileType]  || File;
  const color = FILE_TYPE_COLORS[file.fileType] || 'var(--text-muted)';

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ fileIds: [file.id] }));
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(file.id);
    const el = e.currentTarget as HTMLElement;
    e.dataTransfer.setDragImage(el, el.offsetWidth / 2, el.offsetHeight / 2);
  };

  const handleCardClick = () => {
    if (selectionMode) { onToggleSelect(file.id); return; }
    if (!isDragging) onPreview(file);
  };

  return (
    <div
      className="card p-3 group relative transition-all file-card"
      draggable={!selectionMode}
      style={{ borderColor: selected ? '#6366f1' : file.isStarred ? 'rgba(245,158,11,0.3)' : 'var(--border)', background: selected ? 'rgba(99,102,241,0.06)' : file.isStarred ? 'rgba(245,158,11,0.03)' : undefined, cursor: selectionMode ? 'pointer' : isDragging ? 'grabbing' : 'grab', opacity: isDragging ? 0.45 : 1, transform: isDragging ? 'scale(0.97)' : undefined }}
      onClick={handleCardClick}
      onMouseOver={(e) => { if (!isDragging && !selected) (e.currentTarget as HTMLElement).style.borderColor = color; }}
      onMouseOut={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.borderColor = file.isStarred ? 'rgba(245,158,11,0.3)' : 'var(--border)'; }}
      onDragStart={handleDragStart} onDragEnd={onDragEnd}
    >
      {/* ── FIXED: star moved to right:32 to leave room for three-dot button ── */}
      {!selectionMode && <StarButton starred={file.isStarred} onClick={(e) => { e.stopPropagation(); onStar(file.id); }} />}

      <div style={{ position: 'absolute', top: 7, left: 7, zIndex: 10, opacity: selectionMode || selected ? 1 : 0, transition: 'opacity 0.15s' }} className="group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); onToggleSelect(file.id); }}>
        {selected ? <CheckSquare size={15} color="#6366f1" /> : <Square size={15} color="var(--text-muted)" />}
      </div>

      {!selectionMode && (
        <div style={{ position: 'absolute', top: 7, left: 7, opacity: 0, transition: 'opacity 0.15s', color: 'var(--text-subtle)', pointerEvents: 'none' }} className="group-hover:opacity-100">
          <Move size={11} />
        </div>
      )}

      <div className="flex items-start justify-between">
        {/* ── FIXED: paddingRight increased to 44 to give space for both icons ── */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0" style={{ paddingLeft: selectionMode ? 18 : 0, paddingRight: 44, transition: 'padding 0.15s' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
            <Icon size={17} color={color} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>{file.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`badge-${file.fileType.toLowerCase()} text-xs px-1.5 py-0.5 rounded font-medium`}>{file.fileType}</span>
              <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>{formatBytes(file.size)}</span>
            </div>
          </div>
        </div>

        {!selectionMode && (
          // ── FIXED: marginRight: 26 pushes three-dot away from star ──
          <div className="relative flex-shrink-0" style={{ marginRight: 26 }}>
            <button className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}>
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <ContextMenu onClose={() => setMenuOpen(false)} items={[
                { icon: Eye,      label: 'Preview',         action: () => onPreview(file)    },
                { icon: Star,     label: file.isStarred ? 'Unstar' : 'Star', action: () => onStar(file.id) },
                { icon: Clock,    label: 'Version History', action: () => onVersions(file)   },
                { icon: Share2,   label: 'Share',           action: () => onShare(file)      },
                { icon: Download, label: 'Download',        action: () => onDownload(file)   },
                { icon: Pencil,   label: 'Rename',          action: () => onRename(file)     },
                { icon: Trash2,   label: 'Delete',          danger: true, action: () => onDelete(file.id) },
              ]} />
            )}
          </div>
        )}
      </div>

      <style>{`
        .file-card:hover .star-btn,
        .folder-card:hover .star-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FilesPage() {
  const qc = useQueryClient();
  const [currentFolderId, setCurrentFolderId]   = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb]             = useState<{ id: string; name: string }[]>([]);
  const [newFolderModal, setNewFolderModal]     = useState(false);
  const [newFolderName, setNewFolderName]       = useState('');
  const [renamingItem, setRenamingItem]         = useState<{ id: string; type: 'folder' | 'file'; name: string } | null>(null);
  const [newName, setNewName]                   = useState('');
  const [previewFile, setPreviewFile]           = useState<any>(null);
  const [shareFile, setShareFile]               = useState<any>(null);
  const [searchQuery, setSearchQuery]           = useState('');
  const [draggingFileId, setDraggingFileId]     = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode]       = useState(false);
  const [selectedIds, setSelectedIds]           = useState<Set<string>>(new Set());
  const [moveModalOpen, setMoveModalOpen]       = useState(false);
  const [versionFile, setVersionFile]           = useState<any>(null);

// ── Close comments panel whenever folder navigation changes ──
  // ── NEW: comment panel state ──────────────────────────────────────────────

  // ── Queries ──
  const { data: folders } = useQuery({
    queryKey: ['folders', currentFolderId],
    queryFn: () => folderApi.getAll(currentFolderId || '').then(r => r.data.data),
  });

  // ── NEW: get current folder details for FolderNoteWidget ─────────────────
  const currentFolder = breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1] : null;

  const { data: files } = useQuery({
    queryKey: ['files', currentFolderId],
    queryFn: () => currentFolderId ? fileApi.getInFolder(currentFolderId).then(r => r.data.data?.files ?? r.data.data ?? []) : Promise.resolve([]),
    enabled: !!currentFolderId,
  });
  const { data: allFolders } = useQuery({
    queryKey: ['folders-all'],
    queryFn: () => folderApi.getAllFlat().then(r => r.data.data),
    enabled: moveModalOpen,
  });

  const starFileMut = useMutation({
    mutationFn: (id: string) => fileApi.toggleStar(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['files'] });
      qc.invalidateQueries({ queryKey: ['starred'] });
      const starred = res.data.data.isStarred;
      toast(starred ? '⭐ Added to Starred' : 'Removed from Starred', { duration: 1800 });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });
  const starFolderMut = useMutation({
    mutationFn: (id: string) => folderApi.toggleStar(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['folders'] });
      qc.invalidateQueries({ queryKey: ['starred'] });
      const starred = res.data.data.isStarred;
      toast(starred ? '⭐ Added to Starred' : 'Removed from Starred', { duration: 1800 });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });
  const bulkDeleteMut = useMutation({
    mutationFn: (ids: string[]) => fileApi.bulkDelete(ids),
    onSuccess: (_, ids) => { qc.invalidateQueries({ queryKey: ['files'] }); qc.invalidateQueries({ queryKey: ['active-subscription'] }); toast.success(`${ids.length} file${ids.length !== 1 ? 's' : ''} deleted`); exitSelection(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Bulk delete failed'),
  });
  const bulkMoveMut = useMutation({
    mutationFn: ({ ids, targetFolderId }: { ids: string[]; targetFolderId: string }) => fileApi.bulkMove(ids, targetFolderId),
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ['files'] }); qc.invalidateQueries({ queryKey: ['folders'] }); const name = (allFolders || []).find((f: any) => f.id === vars.targetFolderId)?.name || 'folder'; toast.success(`${vars.ids.length} file${vars.ids.length !== 1 ? 's' : ''} moved to "${name}"`); setMoveModalOpen(false); exitSelection(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Bulk move failed'),
  });
  const moveFileMut = useMutation({
    mutationFn: ({ fileId, targetFolderId }: { fileId: string; targetFolderId: string }) => fileApi.move(fileId, targetFolderId),
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ['files'] }); qc.invalidateQueries({ queryKey: ['folders'] }); const n = (folders || []).find((f: any) => f.id === vars.targetFolderId)?.name || 'folder'; toast.success(`Moved to "${n}"`); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to move file'),
  });

  const toggleSelect   = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll      = () => setSelectedIds(new Set((filteredFiles || []).map((f: any) => f.id)));
  const clearSelection = () => setSelectedIds(new Set());
  const exitSelection  = () => { setSelectionMode(false); setSelectedIds(new Set()); };

  const handleBulkDownload = async () => {
    const ids = Array.from(selectedIds);
    const token = localStorage.getItem('accessToken');
    const sel = (files || []).filter((f: any) => ids.includes(f.id));
    toast(`Downloading ${ids.length} file${ids.length !== 1 ? 's' : ''}…`, { icon: '⬇️' });
    for (const file of sel) {
      await new Promise<void>(resolve => {
        fetch(fileApi.getDownloadUrl(file.id), { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.blob()).then(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.originalName; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); })
          .finally(() => setTimeout(resolve, 400));
      });
    }
  };
  const handleBulkDelete = () => { const ids = Array.from(selectedIds); if (!confirm(`Delete ${ids.length} file${ids.length !== 1 ? 's' : ''}? This cannot be undone.`)) return; bulkDeleteMut.mutate(ids); };
  const handleBulkMove   = (fId: string) => bulkMoveMut.mutate({ ids: Array.from(selectedIds), targetFolderId: fId });
  const handleDragStart  = (fileId: string) => setDraggingFileId(fileId);
  const handleDragEnd    = () => { setDraggingFileId(null); setDragOverFolderId(null); };

  const folderDropHandlers = {
    onDragOver:  (fId: string) => setDragOverFolderId(fId),
    onDragLeave: () => setDragOverFolderId(null),
    onDrop: (targetFolderId: string, fileIds: string[]) => {
      setDragOverFolderId(null); setDraggingFileId(null);
      if (targetFolderId === currentFolderId) { toast('File is already in this folder', { icon: 'ℹ️' }); return; }
      fileIds.forEach(fileId => moveFileMut.mutate({ fileId, targetFolderId }));
    },
  };

  const createFolder = useMutation({
    mutationFn: (name: string) => folderApi.create({ name, parentId: currentFolderId || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['folders'] }); setNewFolderModal(false); setNewFolderName(''); toast.success('Folder created'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });
  const renameFolder = useMutation({
    mutationFn: ({ id, name }: any) => folderApi.rename(id, name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['folders'] }); setRenamingItem(null); toast.success('Renamed'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });
  const deleteFolder = useMutation({
    mutationFn: (id: string) => folderApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['folders'] }); toast.success('Folder deleted'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });
  const renameFile = useMutation({
    mutationFn: ({ id, name }: any) => fileApi.rename(id, name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['files'] }); setRenamingItem(null); toast.success('Renamed'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });
  const deleteFileMut = useMutation({
    mutationFn: (id: string) => fileApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['files'] }); toast.success('File deleted'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });
  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => fileApi.upload(formData),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['files'] }); qc.invalidateQueries({ queryKey: ['active-subscription'] }); toast.success('File uploaded!'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Upload failed'),
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!currentFolderId) { toast.error('Please open a folder first'); return; }
    acceptedFiles.forEach(file => { const fd = new FormData(); fd.append('file', file); fd.append('folderId', currentFolderId); uploadMutation.mutate(fd); });
  }, [currentFolderId, uploadMutation]);

  const { getRootProps, getInputProps, isDragActive, open: openFilePicker } = useDropzone({ onDrop, noClick: true, noKeyboard: true });

  const openFolder = async (folderId: string) => {
    try { const res = await folderApi.getBreadcrumb(folderId); setBreadcrumb(res.data.data); } catch {}
    setCurrentFolderId(folderId); exitSelection();
  };
  const navigateBreadcrumb = (index: number) => {
    if (index === -1) { setCurrentFolderId(null); setBreadcrumb([]); }
    else { const f = breadcrumb[index]; setBreadcrumb(breadcrumb.slice(0, index + 1)); setCurrentFolderId(f.id); }
    exitSelection();
  };
  const handleDownload = (file: any) => {
    const token = localStorage.getItem('accessToken');
    fetch(fileApi.getDownloadUrl(file.id), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob()).then(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.originalName; a.click(); });
  };

  const filteredFolders = (folders || []).filter((f: any) => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredFiles   = (files   || []).filter((f: any) => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const isDraggingAny   = !!draggingFileId;
  const selectedCount   = selectedIds.size;
  const allSelected     = filteredFiles.length > 0 && selectedCount === filteredFiles.length;

  return (
    <AuthGuard>
      <AppLayout>
        <div className="h-full flex flex-col" {...getRootProps()}>
          <input {...getInputProps()} />

          {/* Header */}
          <div className="flex items-center justify-between px-8 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Files & Folders</h1>
              <div className="flex items-center gap-1 mt-1">
                <button className="text-xs hover:text-white transition-colors" style={{ color: currentFolderId ? 'var(--text-subtle)' : 'var(--primary-light)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigateBreadcrumb(-1)}>Home</button>
                {breadcrumb.map((crumb, idx) => (
                  <span key={crumb.id} className="flex items-center gap-1">
                    <ChevronRight size={12} style={{ color: 'var(--text-subtle)' }} />
                    <button className="text-xs hover:text-white transition-colors" style={{ color: idx === breadcrumb.length - 1 ? 'var(--primary-light)' : 'var(--text-subtle)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigateBreadcrumb(idx)}>{crumb.name}</button>
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentFolderId && filteredFiles.length > 0 && (
                <button onClick={selectionMode ? exitSelection : () => setSelectionMode(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, background: selectionMode ? 'rgba(99,102,241,0.15)' : 'var(--surface-2)', border: `1px solid ${selectionMode ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`, color: selectionMode ? '#818cf8' : 'var(--text-muted)', cursor: 'pointer' }}>
                  <CheckSquare size={13} />{selectionMode ? 'Cancel' : 'Select'}
                </button>
              )}
              {currentFolderId && filteredFiles.length > 0 && !isDraggingAny && !selectionMode && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-subtle)', fontSize: '0.75rem', padding: '4px 10px', borderRadius: 6, background: 'var(--surface-2)' }}>
                  <Move size={12} /> Drag to move
                </div>
              )}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-subtle)' }} />
                <input className="input pl-8 py-2" style={{ width: 180, fontSize: '0.8125rem' }} placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              {currentFolderId && (
                <button className="btn-ghost flex items-center gap-2 py-2" onClick={openFilePicker} disabled={uploadMutation.isPending}><Upload size={14} /><span className="text-sm">Upload</span></button>
              )}
              <button className="btn-primary flex items-center gap-2 py-2" onClick={() => setNewFolderModal(true)}><Plus size={14} /><span className="text-sm">New Folder</span></button>
            </div>
          </div>

          {isDragActive && !isDraggingAny && (
            <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)', border: '2px dashed var(--primary)' }}>
              <div className="text-center"><Upload size={48} color="var(--primary-light)" className="mx-auto mb-3" /><p className="font-semibold" style={{ color: 'var(--primary-light)' }}>Drop files here to upload</p></div>
            </div>
          )}
          {isDraggingAny && (
            <div style={{ background: 'rgba(99,102,241,0.1)', borderBottom: '1px solid rgba(99,102,241,0.3)', padding: '8px 32px', display: 'flex', alignItems: 'center', gap: 8, color: '#818cf8', fontSize: '0.8rem', fontWeight: 500 }}>
              <Move size={14} /> Drop onto a folder below to move the file there
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-auto p-8" style={{ paddingBottom: selectionMode && selectedCount > 0 ? 100 : 32 }}>

            {!currentFolderId && filteredFolders.length === 0 && (
              <div className="text-center py-20">
                <Folder size={56} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--text-muted)' }} />
                <p className="font-medium mb-2" style={{ color: 'var(--text-muted)' }}>No folders yet</p>
                <p className="text-sm mb-4" style={{ color: 'var(--text-subtle)' }}>Create your first folder to get started</p>
                <button className="btn-primary" onClick={() => setNewFolderModal(true)}><Plus size={14} className="inline mr-1" /> New Folder</button>
              </div>
            )}

            {filteredFolders.length > 0 && (
              <div className="mb-6">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-subtle)' }}>Folders ({filteredFolders.length})</p>
                  {isDraggingAny && <span style={{ fontSize: '0.7rem', color: '#818cf8', fontWeight: 600, background: 'rgba(99,102,241,0.12)', padding: '2px 8px', borderRadius: 999 }}>↓ Drop target</span>}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filteredFolders.map((folder: any) => (
                    <FolderCard key={folder.id} folder={folder} onOpen={openFolder}
                      isDragOver={dragOverFolderId === folder.id} onDrop={folderDropHandlers}
                      onStar={(id: string) => starFolderMut.mutate(id)}
                      onRename={(f: any) => { setRenamingItem({ id: f.id, type: 'folder', name: f.name }); setNewName(f.name); }}
                      onDelete={(id: string) => { if (confirm('Delete this folder and all its contents?')) deleteFolder.mutate(id); }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── NEW: Folder Note Widget — shows when inside a folder ── */}
            

            {currentFolderId && filteredFiles.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-subtle)' }}>Files ({filteredFiles.length})</p>
                  {selectionMode && selectedCount > 0 && <span style={{ fontSize: '0.72rem', color: '#818cf8', fontWeight: 600, background: 'rgba(99,102,241,0.12)', padding: '2px 9px', borderRadius: 999 }}>{selectedCount} selected</span>}
                  {selectionMode && <button onClick={allSelected ? clearSelection : selectAll} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>{allSelected ? 'Deselect all' : 'Select all'}</button>}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filteredFiles.map((file: any) => (
                    <FileCard key={file.id} file={file}
                      selectionMode={selectionMode} selected={selectedIds.has(file.id)} onToggleSelect={toggleSelect}
                      isDragging={draggingFileId === file.id} onDragStart={handleDragStart} onDragEnd={handleDragEnd}
                      onPreview={setPreviewFile} onShare={setShareFile} onDownload={handleDownload}
                      onVersions={setVersionFile}
                      onStar={(id: string) => starFileMut.mutate(id)}
                      onRename={(f: any) => { setRenamingItem({ id: f.id, type: 'file', name: f.name }); setNewName(f.name); }}
                      onDelete={(id: string) => { if (confirm('Delete this file?')) deleteFileMut.mutate(id); }}
                    />
                  ))}
                </div>
              </div>
            )}

            {currentFolderId && filteredFolders.length === 0 && filteredFiles.length === 0 && (
              <div className="text-center py-20">
                <Upload size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--text-muted)' }} />
                <p className="font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Folder is empty</p>
                <p className="text-sm mb-4" style={{ color: 'var(--text-subtle)' }}>Upload files or create sub-folders</p>
                <div className="flex gap-2 justify-center">
                  <button className="btn-ghost flex items-center gap-2 text-sm py-2" onClick={openFilePicker}><Upload size={14} /> Upload files</button>
                  <button className="btn-primary flex items-center gap-2 text-sm py-2" onClick={() => setNewFolderModal(true)}><Plus size={14} /> New sub-folder</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {selectionMode && selectedCount > 0 && (
          <BulkToolbar count={selectedCount} total={filteredFiles.length} allSelected={allSelected} onSelectAll={selectAll} onClearAll={clearSelection} onDownload={handleBulkDownload} onDelete={handleBulkDelete} onMove={() => setMoveModalOpen(true)} onExit={exitSelection} isDeleting={bulkDeleteMut.isPending} isMoving={bulkMoveMut.isPending} />
        )}
        {moveModalOpen && <MoveModal allFolders={allFolders} currentFolderId={currentFolderId} selectedCount={selectedCount} onMove={handleBulkMove} onClose={() => setMoveModalOpen(false)} isMoving={bulkMoveMut.isPending} />}

        {newFolderModal && (
          <div className="modal-overlay" onClick={() => setNewFolderModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3 className="font-semibold text-lg mb-4" style={{ color: 'var(--text)' }}>{currentFolderId ? 'New Sub-folder' : 'New Folder'}</h3>
              <input className="input mb-4" placeholder="Folder name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && newFolderName.trim() && createFolder.mutate(newFolderName.trim())} />
              <div className="flex justify-end gap-2">
                <button className="btn-ghost" onClick={() => setNewFolderModal(false)}>Cancel</button>
                <button className="btn-primary" onClick={() => newFolderName.trim() && createFolder.mutate(newFolderName.trim())} disabled={!newFolderName.trim() || createFolder.isPending}>{createFolder.isPending ? 'Creating...' : 'Create'}</button>
              </div>
            </div>
          </div>
        )}
        {renamingItem && (
          <div className="modal-overlay" onClick={() => setRenamingItem(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3 className="font-semibold text-lg mb-4" style={{ color: 'var(--text)' }}>Rename {renamingItem.type}</h3>
              <input className="input mb-4" value={newName} onChange={e => setNewName(e.target.value)} autoFocus onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) { renamingItem.type === 'folder' ? renameFolder.mutate({ id: renamingItem.id, name: newName.trim() }) : renameFile.mutate({ id: renamingItem.id, name: newName.trim() }); } }} />
              <div className="flex justify-end gap-2">
                <button className="btn-ghost" onClick={() => setRenamingItem(null)}>Cancel</button>
                <button className="btn-primary" onClick={() => { if (!newName.trim()) return; renamingItem.type === 'folder' ? renameFolder.mutate({ id: renamingItem.id, name: newName.trim() }) : renameFile.mutate({ id: renamingItem.id, name: newName.trim() }); }}>Rename</button>
              </div>
            </div>
          </div>
        )}

        <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
        <ShareModal isOpen={!!shareFile} onClose={() => setShareFile(null)} file={shareFile} />
        {versionFile && <VersionHistoryPanel file={versionFile} onClose={() => setVersionFile(null)} />}

        {/* ── NEW: Comments panel — slides in from right ── */}

      </AppLayout>
    </AuthGuard>
  );
}