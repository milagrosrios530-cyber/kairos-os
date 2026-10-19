import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  backToLogin?: boolean;
};

export function AuthShell({
  title,
  description,
  children,
  backToLogin = false,
}: AuthShellProps) {
  return (
    <main className="grid min-h-screen bg-[#181716] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden p-12 text-[#f5f0e8] lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(197,164,109,0.28),transparent_34%),linear-gradient(145deg,#24211e,#11100f)]" />
        <div className="relative z-10 flex items-center gap-3">
          <span className="h-px w-12 bg-[#c5a46d]" />
          <span className="text-xs font-semibold tracking-[0.32em] text-[#d8c08f]">
            OPERACIÓN INTERNA
          </span>
        </div>
        <div className="relative z-10 max-w-xl pb-10">
          <p className="font-heading text-6xl leading-[0.95] tracking-tight">
            Cada fecha merece una sola verdad.
          </p>
          <p className="mt-6 max-w-md text-base leading-7 text-[#c8c0b7]">
            Clientes, permisos y reservas se gestionan desde una fuente segura,
            con trazabilidad desde el primer contacto.
          </p>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-[#f5f0e8] px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-9 flex justify-center">
            <Image
              alt="Kairós Salón de Recepciones"
              className="h-auto w-40 object-contain mix-blend-multiply sm:w-48"
              height={240}
              priority
              src="/brand/kairos-logo.png"
              width={200}
            />
          </div>
          <div className="rounded-2xl border border-[#ddd3c4] bg-[#fffdf9] p-6 shadow-[0_22px_70px_rgba(24,23,22,0.12)] sm:p-8">
            <div className="mb-7">
              <p className="mb-2 text-xs font-semibold tracking-[0.24em] text-[#9b773f]">
                KAIROS OS
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </div>
            {children}
            {backToLogin ? (
              <Link
                className="mt-6 block text-center text-sm font-medium text-[#8b672f] underline-offset-4 hover:underline"
                href="/login"
              >
                Volver al inicio de sesión
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
