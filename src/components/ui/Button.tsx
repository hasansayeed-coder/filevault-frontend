'use client';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  type = 'button',
  fullWidth = false,
  icon,
}: ButtonProps) {
  const sizeStyles: Record<string, string> = {
    sm: '0.375rem 0.75rem',
    md: '0.5rem 1.25rem',
    lg: '0.75rem 1.5rem',
  };

  const fontSizes: Record<string, string> = {
    sm: '0.8125rem',
    md: '0.875rem',
    lg: '1rem',
  };

  const getStyles = () => {
    const base = {
      padding: sizeStyles[size],
      fontSize: fontSizes[size],
      borderRadius: '8px',
      fontWeight: 600,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled || loading ? 0.6 : 1,
      border: '1px solid transparent',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      width: fullWidth ? '100%' : 'auto',
      justifyContent: 'center',
      transition: 'all 0.15s',
    };

    if (variant === 'primary') {
      return {
        ...base,
        background: 'var(--primary)',
        color: 'white',
        borderColor: 'var(--primary)',
      };
    }

    if (variant === 'ghost') {
      return {
        ...base,
        background: 'transparent',
        color: 'var(--text-muted)',
        borderColor: 'var(--border)',
      };
    }

    if (variant === 'danger') {
      return {
        ...base,
        background: 'rgba(239,68,68,0.1)',
        color: '#ef4444',
        borderColor: 'rgba(239,68,68,0.3)',
      };
    }

    return base;
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={getStyles() as React.CSSProperties}
    >
      {loading ? (
        <>
          <div
            style={{
              width: 14,
              height: 14,
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
            }}
          />
          Loading...
        </>
      ) : (
        <>
          {icon && icon}
          {children}
        </>
      )}
    </button>
  );
}