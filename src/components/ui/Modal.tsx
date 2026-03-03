'use client';

import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: number;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 480,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth, width: '90%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3
            className="font-semibold text-lg"
            style={{ color: 'var(--text)' }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              color: 'var(--text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 6,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}