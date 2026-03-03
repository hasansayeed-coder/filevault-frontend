import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { folderApi } from '@/lib/api';
import { Folder, BreadcrumbItem, RenameItem } from '@/types';

export function useFolders(currentFolderId: string | null) {
  const qc = useQueryClient();

  // ─── State ──────────────────────────────────────────────────
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [newFolderModal, setNewFolderModal] = useState(false);
  const [renamingItem, setRenamingItem] = useState<RenameItem | null>(null);

  // ─── Fetch folders ──────────────────────────────────────────
  const {
    data: folders,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['folders', currentFolderId],
    queryFn: () =>
      folderApi
        .getAll(currentFolderId || '')
        .then((r) => r.data.data as Folder[]),
  });

  // ─── Fetch all folders (for move dialog) ───────────────────
  const { data: allFolders } = useQuery({
    queryKey: ['folders-all'],
    queryFn: () =>
      folderApi.getAll('').then((r) => r.data.data as Folder[]),
  });

  // ─── Create folder ──────────────────────────────────────────
  const createFolder = useMutation({
    mutationFn: (name: string) =>
      folderApi.create({
        name,
        parentId: currentFolderId || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folders'] });
      qc.invalidateQueries({ queryKey: ['active-subscription'] });
      setNewFolderModal(false);
      toast.success('Folder created successfully');
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || 'Failed to create folder'
      );
    },
  });

  // ─── Rename folder ──────────────────────────────────────────
  const renameFolder = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      folderApi.rename(id, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folders'] });
      setRenamingItem(null);
      toast.success('Folder renamed successfully');
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || 'Failed to rename folder'
      );
    },
  });

  // ─── Delete folder ──────────────────────────────────────────
  const deleteFolder = useMutation({
    mutationFn: (id: string) => folderApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folders'] });
      qc.invalidateQueries({ queryKey: ['active-subscription'] });
      toast.success('Folder deleted successfully');
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || 'Failed to delete folder'
      );
    },
  });

  // ─── Navigation ─────────────────────────────────────────────
  const openFolder = async (
    folderId: string,
    setCurrentFolderId: (id: string | null) => void
  ) => {
    try {
      const res = await folderApi.getBreadcrumb(folderId);
      setBreadcrumb(res.data.data);
      setCurrentFolderId(folderId);
    } catch {
      setCurrentFolderId(folderId);
    }
  };

  const navigateBreadcrumb = (
    index: number,
    setCurrentFolderId: (id: string | null) => void
  ) => {
    if (index === -1) {
      setCurrentFolderId(null);
      setBreadcrumb([]);
    } else {
      const folder = breadcrumb[index];
      setBreadcrumb(breadcrumb.slice(0, index + 1));
      setCurrentFolderId(folder.id);
    }
  };

  // ─── Helpers ────────────────────────────────────────────────
  const startRenaming = (folder: Folder) => {
    setRenamingItem({
      id: folder.id,
      name: folder.name,
      type: 'folder',
    });
  };

  const confirmDeleteFolder = (id: string) => {
    if (confirm('Delete this folder and all its contents?')) {
      deleteFolder.mutate(id);
    }
  };

  return {
    // Data
    folders: folders || [],
    allFolders: allFolders || [],
    breadcrumb,
    isLoading,
    isError,

    // Modals state
    newFolderModal,
    setNewFolderModal,
    renamingItem,
    setRenamingItem,

    // Actions
    createFolder,
    renameFolder,
    deleteFolder,
    openFolder,
    navigateBreadcrumb,
    startRenaming,
    confirmDeleteFolder,
  };
}