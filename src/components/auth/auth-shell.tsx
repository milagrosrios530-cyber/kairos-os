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
    <main className="grid min-h-screen bg-[#f5f5f7] lg:grid-cols-[minmax(420px,0.9fr)_minmax(520px,1.1fr)]">
      <section className="relative hidden overflow-hidden bg-[#1d1d1f] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(197,164,109,0.22),transparent_28%),radial-gradient(circle_at_86%_88%,rgba(255,255,255,0.08),transparent_34%)]" />
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-[14px] bg-[linear-gradient(145deg,#e8d29f,#b58a43)] font-heading text-xl font-semibold text-[#201b14] shadow-[0_8px_24px_rgba(197,164,109,0.2)]">
            K
          </span>
          <div>
            <p className="text-[15px] font-semibold tracking-[0.14em]">KAIROS OS</p>
            <p className="mt-0.5 text-[9px] font-medium tracking-[0.2em] text-white/42">
              GESTIÓN INTERNA
            </p>
          </div>
        </div>
        <div className="relative z-10 max-w-lg pb-8">
          <p className="text-5xl font-semibold leading-[1.02] tracking-[-0.045em] xl:text-6xl">
            Una operación clara, desde el primer contacto.
          </p>
          <p className="mt-6 max-w-md text-[15px] leading-7 text-white/52">
            Acceso seguro para el equipo de Kairós. Clientes, permisos y cada
            cambio importante permanecen conectados y trazables.
          </p>
          <div className="mt-10 flex items-center gap-2 text-xs text-white/42">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Entorno interno protegido
          </div>
        </div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(197,164,109,0.12),transparent_62%)] lg:hidden" />
        <div className="relative w-full max-w-[440px]">
          <div className="mb-8 flex justify-center lg:hidden">
            <Image
              alt="Kairós Salón de Recepciones"
              className="h-auto w-32 object-contain mix-blend-multiply sm:w-40"
              height={240}
              priority
              src="/brand/kairos-logo.png"
              width={200}
            />
          </div>
          <div className="rounded-[28px] border border-black/[0.06] bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.08)] sm:p-9">
            <div className="mb-8">
              <p className="mb-3 text-[11px] font-semibold tracking-[0.2em] text-[#8b672f]">
                ACCESO SEGURO
              </p>
              <h1 className="text-[32px] font-semibold tracking-[-0.035em]">{title}</h1>
              <p className="mt-2.5 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </div>
            {children}
            {backToLogin ? (
              <Link
                className="mt-6 block text-center text-sm font-medium text-[#7a5928] underline-offset-4 hover:underline"
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
