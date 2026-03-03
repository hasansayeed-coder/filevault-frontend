'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { folderApi, fileApi } from '@/lib/api';
import Modal from '@/components/ui/Modal';

interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    name: string;
    type: 'folder' | 'file';
  } | null;
}

export default function RenameModal({
  isOpen,
  onClose,
  item,
}: RenameModalProps) {
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');

  // Pre-fill name when item changes
  useEffect(() => {
    if (item) setNewName(item.name);
  }, [item]);

  const renameFolder = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      folderApi.rename(id, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folders'] });
      toast.success('Folder renamed successfully');
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to rename folder');
    },
  });

  const renameFile = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      fileApi.rename(id, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] });
      toast.success('File renamed successfully');
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to rename file');
    },
  });

  const handleSubmit = () => {
    if (!newName.trim() || !item) return;
    if (newName.trim() === item.name) {
      onClose();
      return;
    }
    if (item.type === 'folder') {
      renameFolder.mutate({ id: item.id, name: newName.trim() });
    } else {
      renameFile.mutate({ id: item.id, name: newName.trim() });
    }
  };

  const isPending = renameFolder.isPending || renameFile.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Rename ${item?.type === 'folder' ? 'Folder' : 'File'}`}
    >
      {/* Current name */}
      <p className="text-xs mb-3" style={{ color: 'var(--text-subtle)' }}>
        Current name:{' '}
        <span style={{ color: 'var(--text-muted)' }}>{item?.name}</span>
      </p>

      {/* Input */}
      <div className="mb-4">
        <label className="label">New Name</label>
        <input
          className="input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') onClose();
          }}
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={!newName.trim() || isPending}
          style={{ opacity: !newName.trim() || isPending ? 0.6 : 1 }}
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Renaming...
            </span>
          ) : (
            'Rename'
          )}
        </button>
      </div>
    </Modal>
  );
}