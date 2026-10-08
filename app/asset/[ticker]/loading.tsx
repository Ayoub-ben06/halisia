function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.06] ${className}`} />;
}

export default function AssetLoading() {
  return (
    <main className="mx-auto max-w-[1400px] space-y-8 p-4 sm:p-8">
      <Block className="h-5 w-36" />
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8"><Block className="h-20" /><Block className="h-52" /><Block className="h-96" /><Block className="h-[520px]" /></div>
        <div className="space-y-6 lg:col-span-4"><Block className="h-64" /><Block className="h-52" /></div>
      </div>
    </main>
  );
}
