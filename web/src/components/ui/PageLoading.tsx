export default function PageLoading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-dark-background gap-4 animate-fade-in">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-primary-600/30 border-t-primary-500 animate-spin" />
        <div className="absolute inset-0 rounded-full blur-xl bg-primary-600/20" />
      </div>
      <p className="text-sm text-text-tertiary">{label}</p>
    </div>
  );
}
