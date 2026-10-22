import Link from "next/link";

import { Button } from "@/components/ui/button";

type PaginationNavProps = {
  label: string;
  page: number;
  pageSize: number;
  pathname: string;
  query?: Record<string, string | number | undefined>;
  total: number;
};

export function PaginationNav({
  label,
  page,
  pageSize,
  pathname,
  query = {},
  total,
}: PaginationNavProps) {
  if (total <= pageSize) return null;
  const href = (nextPage: number) => ({
    pathname,
    query: { ...query, pagina: nextPage },
  });

  return (
    <nav
      aria-label="Paginación"
      className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-black/[0.055]"
    >
      <span className="text-muted-foreground">
        Página {page} · {total} {label}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button render={<Link href={href(page - 1)} />} variant="outline">
            Anterior
          </Button>
        ) : null}
        {page * pageSize < total ? (
          <Button render={<Link href={href(page + 1)} />} variant="outline">
            Siguiente
          </Button>
        ) : null}
      </div>
    </nav>
  );
}
