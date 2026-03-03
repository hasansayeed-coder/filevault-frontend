'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { folderApi } from '@/lib/api';
import Modal from '@/components/ui/Modal';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentId: string | null;
}

export default function CreateFolderModal({
  isOpen,
  onClose,
  parentId,
}: CreateFolderModalProps) {
  const qc = useQueryClient();
  const [folderName, setFolderName] = useState('');

  const createFolder = useMutation({
    mutationFn: (name: string) =>
      folderApi.create({ name, parentId: parentId || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folders'] });
      qc.invalidateQueries({ queryKey: ['active-subscription'] });
      toast.success('Folder created successfully');
      setFolderName('');
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create folder');
    },
  });

  const handleSubmit = () => {
    if (!folderName.trim()) return;
    createFolder.mutate(folderName.trim());
  };

  const handleClose = () => {
    setFolderName('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={parentId ? 'New Sub-folder' : 'New Folder'}
    >
      {/* Input */}
      <div className="mb-4">
        <label className="label">Folder Name</label>
        <input
          className="input"
          placeholder="e.g. My Documents"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') handleClose();
          }}
        />
      </div>

      {/* Info about parent */}
      {parentId && (
        <p
          className="text-xs mb-4"
          style={{ color: 'var(--text-subtle)' }}
        >
          This will be created as a sub-folder
        </p>
      )}

      {/* Buttons */}
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={handleClose}>
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={!folderName.trim() || createFolder.isPending}
          style={{ opacity: !folderName.trim() || createFolder.isPending ? 0.6 : 1 }}
        >
          {createFolder.isPending ? (
            <span className="flex items-center gap-2">
              <div
                className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"
              />
              Creating...
            </span>
          ) : (
            'Create Folder'
          )}
        </button>
      </div>
    </Modal>
  );
}