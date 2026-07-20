import { Toaster, toast } from 'sonner';

export default function AppToaster() {
  // Cast evita conflito de @types/react entre workspaces do monorepo.
  const ToastHost = Toaster as any;
  return (
    <ToastHost
      theme="dark"
      position="top-right"
      closeButton
      richColors
      expand
      gap={10}
      toastOptions={{
        classNames: {
          toast:
            'group border border-dark-border bg-dark-card text-text-primary shadow-card-elevated rounded-xl font-sans',
          title: 'text-sm font-semibold text-text-primary',
          description: 'text-sm text-text-tertiary',
          success: 'border-success-500/30',
          error: 'border-error-500/30',
          warning: 'border-warning-500/30',
          info: 'border-primary-500/30',
          closeButton:
            'bg-dark-cardElevated border-dark-border text-text-tertiary hover:text-text-primary',
          actionButton: 'bg-primary-600 text-text-primary',
          cancelButton: 'bg-dark-cardElevated text-text-secondary',
        },
      }}
    />
  );
}

export { toast };
