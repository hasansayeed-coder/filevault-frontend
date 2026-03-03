'use client';

interface ContextMenuItem {
  icon?: any;
  label: string;
  action: () => void;
  danger?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  onClose: () => void;
  position?: 'bottom-right' | 'bottom-left';
}

export default function ContextMenu({
  items,
  onClose,
  position = 'bottom-right',
}: ContextMenuProps) {
  const positionStyles =
    position === 'bottom-right'
      ? { top: '100%', right: 0, marginTop: 4 }
      : { top: '100%', left: 0, marginTop: 4 };

  return (
    <>
      {/* Backdrop to close menu */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Menu */}
      <div
        className="context-menu absolute z-50"
        style={positionStyles}
      >
        {items.map((item, i) => (
          <div
            key={i}
            className={`context-menu-item ${item.danger ? 'danger' : ''}`}
            onClick={() => {
              item.action();
              onClose();
            }}
          >
            {item.icon && <item.icon size={14} />}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}