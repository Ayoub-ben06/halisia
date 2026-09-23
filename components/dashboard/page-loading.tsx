export function PageLoading() {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center bg-background text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 text-sm font-medium">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        Chargement…
      </div>
    </div>
  );
}
