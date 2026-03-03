'use client';

import { useState } from 'react';
import {
  MoreVertical, Pencil, Trash2, Download, Eye,
  Image, Video, Music, FileText, File, Share2,
} from 'lucide-react';
import ContextMenu from '@/components/ui/ContextMenu';

const FILE_TYPE_ICONS: Record<string, any> = {
  IMAGE: Image,
  VIDEO: Video,
  AUDIO: Music,
  PDF: FileText,
};

const FILE_TYPE_COLORS: Record<string, string> = {
  IMAGE: '#10b981',
  VIDEO: '#ef4444',
  AUDIO: '#f59e0b',
  PDF: '#3b82f6',
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

interface FileItem {
  id: string;
  name: string;
  originalName: string;
  fileType: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

interface FileCardProps {
  file: FileItem;
  onRename: (file: FileItem) => void;
  onDelete: (id: string) => void;
  onDownload: (file: FileItem) => void;
  onPreview: (file: FileItem) => void;
  onShare: (file: FileItem) => void;  // ← added
}

export default function FileCard({
  file,
  onRename,
  onDelete,
  onDownload,
  onPreview,
  onShare,  // ← added
}: FileCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const Icon = FILE_TYPE_ICONS[file.fileType] || File;
  const color = FILE_TYPE_COLORS[file.fileType] || 'var(--text-muted)';

  return (
    <div
      className="card p-3 group relative transition-all"
      style={{ borderColor: 'var(--border)', cursor: 'pointer' }}
      onClick={() => onPreview(file)}
      onMouseOver={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = color;
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
      }}
    >
      <div className="flex items-start justify-between">

        {/* File info */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}20` }}
          >
            <Icon size={17} color={color} />
          </div>
          <div className="min-w-0">
            <p
              className="font-medium text-sm truncate"
              style={{ color: 'var(--text)' }}
            >
              {file.name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`badge-${file.fileType.toLowerCase()} text-xs px-1.5 py-0.5 rounded font-medium`}
              >
                {file.fileType}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                {formatBytes(file.size)}
              </span>
            </div>
          </div>
        </div>

        {/* Menu button */}
        <div className="relative flex-shrink-0">
          <button
            className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              color: 'var(--text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <ContextMenu
              onClose={() => setMenuOpen(false)}
              items={[
                {
                  icon: Eye,
                  label: 'Preview',
                  action: () => onPreview(file),
                },
                {
                  icon: Share2,
                  label: 'Share',
                  action: () => onShare(file),
                },
                {
                  icon: Download,
                  label: 'Download',
                  action: () => onDownload(file),
                },
                {
                  icon: Pencil,
                  label: 'Rename',
                  action: () => onRename(file),
                },
                {
                  icon: Trash2,
                  label: 'Delete',
                  danger: true,
                  action: () => onDelete(file.id),
                },
              ]}
            />
          )}
        </div>
      </div>
    </div>
  );
}