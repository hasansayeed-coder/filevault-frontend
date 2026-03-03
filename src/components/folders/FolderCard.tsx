'use client';

import { useState } from 'react';
import { FolderOpen, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import ContextMenu from '@/components/ui/ContextMenu';

interface Folder {
  id: string;
  name: string;
  _count?: {
    subfolders: number;
    files: number;
  };
}

interface FolderCardProps {
  folder: Folder;
  onOpen: (id: string) => void;
  onRename: (folder: Folder) => void;
  onDelete: (id: string) => void;
}

export default function FolderCard({
  folder,
  onOpen,
  onRename,
  onDelete,
}: FolderCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="card p-3 cursor-pointer group relative transition-all"
      style={{ borderColor: 'var(--border)' }}
      onDoubleClick={() => onOpen(folder.id)}
      onMouseOver={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = '#6366f1';
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
      }}
    >
      <div className="flex items-start justify-between">
        {/* Folder info */}
        <div
          className="flex items-center gap-2.5 flex-1 min-w-0"
          onClick={() => onOpen(folder.id)}
        >
          <FolderOpen size={28} color="#f59e0b" />
          <div className="min-w-0">
            <p
              className="font-medium text-sm truncate"
              style={{ color: 'var(--text)' }}
            >
              {folder.name}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-subtle)' }}>
              {folder._count?.subfolders || 0} folders ·{' '}
              {folder._count?.files || 0} files
            </p>
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
                  icon: Pencil,
                  label: 'Rename',
                  action: () => onRename(folder),
                },
                {
                  icon: Trash2,
                  label: 'Delete',
                  danger: true,
                  action: () => onDelete(folder.id),
                },
              ]}
            />
          )}
        </div>
      </div>
    </div>
  );
}