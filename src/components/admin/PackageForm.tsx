'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { packagesApi } from '@/lib/api';
import Modal from '@/components/ui/Modal';

const FILE_TYPES = ['IMAGE', 'VIDEO', 'PDF', 'AUDIO'];

const PACKAGE_NAMES = ['FREE', 'SILVER', 'GOLD', 'DIAMOND'];

interface PackageFormData {
  name: string;
  displayName: string;
  description: string;
  maxFolders: number;
  maxNestingLevel: number;
  allowedFileTypes: string[];
  maxFileSizeMB: number;
  totalFileLimit: number;
  filesPerFolder: number;
}

interface PackageFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingPackage?: any;
}

const defaultForm: PackageFormData = {
  name: 'FREE',
  displayName: '',
  description: '',
  maxFolders: 5,
  maxNestingLevel: 2,
  allowedFileTypes: ['IMAGE', 'PDF'],
  maxFileSizeMB: 5,
  totalFileLimit: 20,
  filesPerFolder: 5,
};

export default function PackageForm({
  isOpen,
  onClose,
  editingPackage,
}: PackageFormProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<PackageFormData>(defaultForm);

  // Pre-fill form when editing
  useEffect(() => {
    if (editingPackage) {
      setForm({
        name: editingPackage.name,
        displayName: editingPackage.displayName,
        description: editingPackage.description || '',
        maxFolders: editingPackage.maxFolders,
        maxNestingLevel: editingPackage.maxNestingLevel,
        allowedFileTypes: editingPackage.allowedFileTypes,
        maxFileSizeMB: editingPackage.maxFileSizeMB,
        totalFileLimit: editingPackage.totalFileLimit,
        filesPerFolder: editingPackage.filesPerFolder,
      });
    } else {
      setForm(defaultForm);
    }
  }, [editingPackage, isOpen]);

  const createPackage = useMutation({
    mutationFn: (data: PackageFormData) => packagesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packages'] });
      toast.success('Package created successfully');
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create package');
    },
  });

  const updatePackage = useMutation({
    mutationFn: (data: PackageFormData) =>
      packagesApi.update(editingPackage.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packages'] });
      toast.success('Package updated successfully');
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update package');
    },
  });

  const handleSubmit = () => {
    if (!form.displayName.trim()) {
      toast.error('Display name is required');
      return;
    }
    if (form.allowedFileTypes.length === 0) {
      toast.error('Select at least one file type');
      return;
    }
    if (editingPackage) {
      updatePackage.mutate(form);
    } else {
      createPackage.mutate(form);
    }
  };

  const toggleFileType = (type: string) => {
    setForm((prev) => ({
      ...prev,
      allowedFileTypes: prev.allowedFileTypes.includes(type)
        ? prev.allowedFileTypes.filter((t) => t !== type)
        : [...prev.allowedFileTypes, type],
    }));
  };

  const updateField = (field: keyof PackageFormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const isPending = createPackage.isPending || updatePackage.isPending;

  const FILE_TYPE_COLORS: Record<string, string> = {
    IMAGE: '#10b981',
    VIDEO: '#ef4444',
    AUDIO: '#f59e0b',
    PDF: '#3b82f6',
  };

  const TIER_COLORS: Record<string, string> = {
    FREE: '#8888a8',
    SILVER: '#94a3b8',
    GOLD: '#f59e0b',
    DIAMOND: '#818cf8',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingPackage ? 'Edit Package' : 'Create Package'}
      maxWidth={560}
    >
      <div
        className="space-y-4 overflow-y-auto"
        style={{ maxHeight: '65vh', paddingRight: 4 }}
      >
        {/* Package Tier */}
        {!editingPackage && (
          <div>
            <label className="label">Package Tier</label>
            <div className="grid grid-cols-4 gap-2">
              {PACKAGE_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => updateField('name', name)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 8,
                    border: `2px solid ${
                      form.name === name
                        ? TIER_COLORS[name]
                        : 'var(--border)'
                    }`,
                    background:
                      form.name === name
                        ? `${TIER_COLORS[name]}15`
                        : 'transparent',
                    color:
                      form.name === name
                        ? TIER_COLORS[name]
                        : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    transition: 'all 0.15s',
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Display Name */}
        <div>
          <label className="label">Display Name</label>
          <input
            className="input"
            placeholder="e.g. Silver Plan"
            value={form.displayName}
            onChange={(e) => updateField('displayName', e.target.value)}
          />
        </div>

        {/* Description */}
        <div>
          <label className="label">Description</label>
          <textarea
            className="input"
            placeholder="Brief description of this plan..."
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            rows={2}
            style={{ resize: 'none' }}
          />
        </div>

        {/* Number fields grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Max Folders</label>
            <input
              className="input"
              type="number"
              min={1}
              value={form.maxFolders}
              onChange={(e) =>
                updateField('maxFolders', parseInt(e.target.value))
              }
            />
          </div>
          <div>
            <label className="label">Max Nesting Level</label>
            <input
              className="input"
              type="number"
              min={1}
              max={20}
              value={form.maxNestingLevel}
              onChange={(e) =>
                updateField('maxNestingLevel', parseInt(e.target.value))
              }
            />
          </div>
          <div>
            <label className="label">Total File Limit</label>
            <input
              className="input"
              type="number"
              min={1}
              value={form.totalFileLimit}
              onChange={(e) =>
                updateField('totalFileLimit', parseInt(e.target.value))
              }
            />
          </div>
          <div>
            <label className="label">Files Per Folder</label>
            <input
              className="input"
              type="number"
              min={1}
              value={form.filesPerFolder}
              onChange={(e) =>
                updateField('filesPerFolder', parseInt(e.target.value))
              }
            />
          </div>
          <div className="col-span-2">
            <label className="label">Max File Size (MB)</label>
            <input
              className="input"
              type="number"
              min={1}
              value={form.maxFileSizeMB}
              onChange={(e) =>
                updateField('maxFileSizeMB', parseFloat(e.target.value))
              }
            />
          </div>
        </div>

        {/* Allowed File Types */}
        <div>
          <label className="label">Allowed File Types</label>
          <div className="grid grid-cols-4 gap-2">
            {FILE_TYPES.map((type) => {
              const selected = form.allowedFileTypes.includes(type);
              const color = FILE_TYPE_COLORS[type];
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleFileType(type)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 8,
                    border: `2px solid ${selected ? color : 'var(--border)'}`,
                    background: selected ? `${color}15` : 'transparent',
                    color: selected ? color : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    transition: 'all 0.15s',
                  }}
                >
                  {type}
                </button>
              );
            })}
          </div>
          {form.allowedFileTypes.length === 0 && (
            <p
              className="text-xs mt-1"
              style={{ color: '#ef4444' }}
            >
              Select at least one file type
            </p>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2 mt-5 pt-4"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <button className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={isPending}
          style={{ opacity: isPending ? 0.6 : 1 }}
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {editingPackage ? 'Updating...' : 'Creating...'}
            </span>
          ) : editingPackage ? (
            'Update Package'
          ) : (
            'Create Package'
          )}
        </button>
      </div>
    </Modal>
  );
}