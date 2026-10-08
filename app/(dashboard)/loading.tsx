function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.06] ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-[1400px] space-y-8 p-4 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <Block className="h-36" /><Block className="h-36" /><Block className="h-36" />
      </div>
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8"><Block className="h-56" /><Block className="h-[480px]" /></div>
        <div className="space-y-6 lg:col-span-4"><Block className="h-64" /><Block className="h-56" /></div>
      </div>
    </main>
  );
}
