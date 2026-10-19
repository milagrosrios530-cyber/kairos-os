import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { getViewer, type Viewer } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function InternalLayout({
  children,
}: {
  children: ReactNode;
}) {
  let viewer: Viewer | null = null;
  let forbidden = false;

  try {
    viewer = await getViewer();
  } catch {
    forbidden = true;
  }

  if (forbidden) {
    redirect("/sin-acceso");
  }

  if (!viewer) {
    redirect("/login");
  }

  return <AppShell viewer={viewer}>{children}</AppShell>;
}
