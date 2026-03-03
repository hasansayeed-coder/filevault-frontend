'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Upload, FolderOpen } from 'lucide-react';
import { fileApi } from '@/lib/api';

interface FileUploadZoneProps {
  folderId: string | null;
  children: React.ReactNode;
}

export default function FileUploadZone({
  folderId,
  children,
}: FileUploadZoneProps) {
  const qc = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => fileApi.upload(formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] });
      qc.invalidateQueries({ queryKey: ['active-subscription'] });
      toast.success('File uploaded successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Upload failed');
    },
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!folderId) {
        toast.error('Please open a folder first before uploading');
        return;
      }
      acceptedFiles.forEach((file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folderId', folderId);
        uploadMutation.mutate(fd);
      });
    },
    [folderId, uploadMutation]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
  });

  return (
    <div {...getRootProps()} className="h-full flex flex-col relative">
      <input {...getInputProps()} />

      {/* Drag overlay */}
      {isDragActive && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{
            background: 'rgba(99,102,241,0.15)',
            border: '2px dashed var(--primary)',
            borderRadius: 12,
          }}
        >
          <div className="text-center">
            <Upload
              size={52}
              color="var(--primary-light)"
              className="mx-auto mb-3"
            />
            <p
              className="font-semibold text-lg"
              style={{ color: 'var(--primary-light)' }}
            >
              Drop files here to upload
            </p>
            {!folderId && (
              <p
                className="text-sm mt-1"
                style={{ color: 'var(--text-muted)' }}
              >
                Open a folder first
              </p>
            )}
          </div>
        </div>
      )}

      {/* Upload progress indicator */}
      {uploadMutation.isPending && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border-light)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
          }}
        >
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm" style={{ color: 'var(--text)' }}>
            Uploading...
          </p>
        </div>
      )}

      {/* Render children with open function passed via context */}
      <FileUploadContext.Provider value={{ open, isPending: uploadMutation.isPending }}>
        {children}
      </FileUploadContext.Provider>
    </div>
  );
}

// Context to expose open() to child components
import { createContext, useContext } from 'react';

interface FileUploadContextType {
  open: () => void;
  isPending: boolean;
}

const FileUploadContext = createContext<FileUploadContextType>({
  open: () => {},
  isPending: false,
});

export const useFileUpload = () => useContext(FileUploadContext);