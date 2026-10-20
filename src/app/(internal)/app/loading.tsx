export default function AppLoading() {
  return (
    <div aria-busy="true" aria-label="Cargando contenido" className="space-y-6">
      <div className="h-48 animate-pulse rounded-[28px] bg-white" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="h-32 animate-pulse rounded-2xl bg-white" key={index} />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-[24px] bg-white" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
