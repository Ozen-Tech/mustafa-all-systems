import React from 'react';
import Modal from './Modal';
import Button from './Button';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

const variantUI: Record<
  ConfirmVariant,
  { iconBg: string; iconColor: string; icon: React.ReactNode; button: 'danger' | 'accent' | 'primary' }
> = {
  danger: {
    iconBg: 'bg-error-500/15',
    iconColor: 'text-error-400',
    button: 'danger',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  warning: {
    iconBg: 'bg-warning-500/15',
    iconColor: 'text-warning-400',
    button: 'accent',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
  },
  info: {
    iconBg: 'bg-primary-500/15',
    iconColor: 'text-primary-400',
    button: 'primary',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    ),
  },
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'info',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ui = variantUI[variant];

  return (
    <Modal
      open={open}
      onClose={loading ? () => undefined : onCancel}
      closeOnOverlay={!loading}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={ui.button} size="md" onClick={onConfirm} isLoading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <div className={`shrink-0 w-12 h-12 rounded-xl ${ui.iconBg} ${ui.iconColor} flex items-center justify-center`}>
          {ui.icon}
        </div>
        <div className="min-w-0 pt-0.5">
          <h3 className="text-base font-semibold text-text-primary">{title}</h3>
          {description && (
            <p className="mt-1.5 text-sm text-text-tertiary leading-relaxed whitespace-pre-line">{description}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
