import {
  PRIVILEGES,
  type Privilege,
  ROLE_PRIVILEGES,
  type Role,
  StatusBadge,
} from '@aletheia/frontend-commons';
import {
  ArrowRight,
  BadgeCheck,
  Ban,
  Check,
  Clock,
  CornerUpLeft,
  FileSignature,
  PenLine,
  RotateCcw,
  Scale,
  ShieldCheck,
  Undo2,
  User,
  XCircle,
} from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { ComponentType } from 'react';

export const metadata: Metadata = {
  title: 'Cómo funciona · ALETHEIA',
  description:
    'El recorrido de un contrato en ALETHEIA: fases, roles y permisos. De la solicitud a la firma, con responsabilidades claras y trazabilidad total.',
};

const H2 = 'text-[clamp(2rem,4vw,3.25rem)] font-heading leading-tight tracking-wide uppercase';
const KICKER = 'text-xs font-sans text-muted-foreground tracking-widest uppercase';

/* ─── Roles ─────────────────────────────────────────────────────────────── */

type RoleView = {
  id: Role;
  label: string;
  icon: ComponentType<{ className?: string }>;
  tagline: string;
  does: string;
};

const ROLE_VIEWS: RoleView[] = [
  {
    id: 'SOLICITANTE',
    label: 'Solicitante',
    icon: User,
    tagline: 'Origina el contrato',
    does: 'Registra la solicitud, adjunta los documentos del proveedor y la envía a revisión. Puede cancelar o recuperar mientras es suya.',
  },
  {
    id: 'ADMINISTRADOR',
    label: 'Administrador',
    icon: ShieldCheck,
    tagline: 'Primera compuerta + administra el sistema',
    does: 'Revisa la solicitud enviada y la aprueba o devuelve. Gestiona usuarios, áreas, apoderados, plantillas y las etapas del flujo. Ve todos los contratos.',
  },
  {
    id: 'ABOGADO',
    label: 'Abogado',
    icon: Scale,
    tagline: 'Validación legal',
    does: 'Revisa jurídicamente el contrato ya validado por el Administrador. Trabaja con plantillas y documentos. Aprueba o devuelve con observaciones.',
  },
  {
    id: 'APROBADOR',
    label: 'Aprobador',
    icon: BadgeCheck,
    tagline: 'Autorización formal',
    does: 'Da la aprobación formal que habilita la firma, o rechaza el contrato. Es la última compuerta humana antes de firmar.',
  },
  {
    id: 'FIRMANTE',
    label: 'Firmante',
    icon: PenLine,
    tagline: 'Cierra el ciclo',
    does: 'Registra la firma en el lienzo (canvas), pudiendo actuar como apoderado. Su firma da validez final al contrato.',
  },
];

/* ─── Fases del flujo ───────────────────────────────────────────────────── */

type Phase = {
  n: number;
  role: string;
  icon: ComponentType<{ className?: string }>;
  statuses: string[];
  action: string;
  privileges: Privilege[];
  result: string;
  notify: string;
};

const PHASES: Phase[] = [
  {
    n: 1,
    role: 'Solicitante',
    icon: User,
    statuses: ['DRAFT'],
    action:
      'Crea la solicitud (sociedad, proveedor, área), adjunta los documentos requeridos y la envía a revisión.',
    privileges: ['CONTRACT_CREATE', 'DOCUMENT_UPLOAD', 'CONTRACT_SUBMIT'],
    result: 'El contrato pasa a «Enviado».',
    notify: 'Administrador',
  },
  {
    n: 2,
    role: 'Administrador',
    icon: ShieldCheck,
    statuses: ['SUBMITTED'],
    action:
      'Revisa datos y documentos. Aprueba para avanzar, o devuelve al Solicitante con observaciones.',
    privileges: ['CONTRACT_REVIEW_ADMIN'],
    result: 'Avanza a revisión legal — o vuelve a «Borrador».',
    notify: 'Abogado (o Solicitante si se devuelve)',
  },
  {
    n: 3,
    role: 'Abogado',
    icon: Scale,
    statuses: ['ADMIN_REVIEW'],
    action:
      'Valida la integridad legal y documental del contrato. Aprueba o devuelve con observaciones.',
    privileges: ['CONTRACT_REVIEW_LAWYER'],
    result: 'Avanza a aprobación formal — o vuelve a «Borrador».',
    notify: 'Aprobador',
  },
  {
    n: 4,
    role: 'Aprobador',
    icon: BadgeCheck,
    statuses: ['LAWYER_REVIEW', 'APPROVAL_PENDING'],
    action: 'Da la aprobación formal que autoriza la firma, o rechaza el contrato definitivamente.',
    privileges: ['CONTRACT_APPROVE'],
    result: 'Habilita la firma — o queda «Rechazado».',
    notify: 'Firmante',
  },
  {
    n: 5,
    role: 'Firmante',
    icon: PenLine,
    statuses: ['SIGNING', 'SIGNED'],
    action:
      'Firma el contrato en el lienzo digital. Puede asociar la firma a un apoderado registrado.',
    privileges: ['CONTRACT_SIGN'],
    result: '«Firmado» — estado final del contrato.',
    notify: 'Todos los involucrados',
  },
];

/* ─── Ramas alternativas ────────────────────────────────────────────────── */

const BRANCHES: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}[] = [
  {
    icon: Undo2,
    title: 'Devolución',
    desc: 'En cualquier revisión (Admin o Abogado), el contrato puede devolverse a «Borrador» con un comentario para que el Solicitante lo corrija. Es el «ping-pong» que evita errores antes de avanzar.',
  },
  {
    icon: XCircle,
    title: 'Rechazo',
    desc: 'El Aprobador puede rechazar formalmente. El contrato pasa a «Rechazado» (estado final) con el motivo registrado en la bitácora.',
  },
  {
    icon: Ban,
    title: 'Cancelación',
    desc: 'Desde cualquier etapa activa, el Solicitante o el Administrador pueden cancelar el contrato indicando un motivo. Pasa a «Cancelado».',
  },
  {
    icon: RotateCcw,
    title: 'Recuperación',
    desc: 'Un contrato «Cancelado» puede reactivarse y vuelve a «Borrador» para reiniciar su proceso, conservando todo su historial.',
  },
];

/* ─── SLA ───────────────────────────────────────────────────────────────── */

const SLA = [
  {
    dot: 'bg-success',
    label: 'En tiempo',
    desc: 'Menos del 60% del tiempo SLA consumido en la etapa actual.',
  },
  {
    dot: 'bg-warning',
    label: 'Por vencer',
    desc: 'Entre el 60% y el 100%. Requiere atención pronto.',
  },
  {
    dot: 'bg-destructive',
    label: 'Vencido',
    desc: 'Se superó el tiempo SLA. El contrato está en mora.',
  },
];

const PRIVILEGE_ENTRIES = Object.entries(PRIVILEGES) as [Privilege, string][];

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function ComoFuncionaPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b-2 border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/landing" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="ALETHEIA"
              width={32}
              height={32}
              className="object-contain"
            />
            <span className="font-heading text-xl uppercase tracking-widest">ALETHEIA</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/landing"
              className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              Inicio
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-base border-2 border-border bg-main px-4 py-2 font-sans text-main-foreground shadow-sm transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
            >
              Entrar <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="border-b-2 border-border bg-grid">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <p className={KICKER}>// Cómo funciona</p>
          <h1 className="mt-4 max-w-4xl text-[clamp(2.5rem,5vw,4.25rem)] font-heading uppercase leading-[1.1] tracking-wide">
            El viaje de un contrato, <span className="text-main">de principio a fin.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-relaxed text-muted-foreground">
            ALETHEIA convierte la gestión de contratos en una cadena de responsabilidades claras.
            Cada contrato recorre cinco fases; en cada una, un rol con permisos exactos decide si
            avanza. Todo queda registrado: quién, qué y cuándo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <a
              href="#flujo"
              className="inline-flex items-center gap-2 rounded-base border-2 border-border bg-background px-4 py-2 font-sans shadow-shadow transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              Ver el flujo <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#permisos"
              className="inline-flex items-center gap-2 rounded-base border-2 border-border bg-background px-4 py-2 font-sans shadow-shadow transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              Matriz de permisos
            </a>
          </div>
        </div>
      </section>

      {/* ROLES */}
      <section className="border-b-2 border-border">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <p className={KICKER}>// Los cinco roles</p>
          <h2 className={`${H2} mt-4`}>Cada quien, su función.</h2>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Los roles no son cargos: son paquetes de permisos. Un usuario ve y ejecuta exactamente
            lo que su rol le concede — ni más, ni menos.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {ROLE_VIEWS.map((r) => {
              const Icon = r.icon;
              return (
                <div
                  key={r.id}
                  className="flex flex-col rounded-base border-2 border-border bg-background p-5 shadow-shadow"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-base border-2 border-border bg-secondary-background">
                    <Icon className="h-5 w-5 text-main" />
                  </div>
                  <h3 className="mt-4 font-heading text-lg uppercase tracking-wide">{r.label}</h3>
                  <p className="mt-1 text-xs font-sans uppercase tracking-wide text-main">
                    {r.tagline}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{r.does}</p>
                  <p className="mt-4 border-t-2 border-border-muted pt-3 text-xs font-sans text-muted-foreground">
                    {ROLE_PRIVILEGES[r.id].length} permisos
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FLUJO / PIPELINE */}
      <section id="flujo" className="scroll-mt-20 border-b-2 border-border bg-grid">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <p className={KICKER}>// El flujo, paso a paso</p>
          <h2 className={`${H2} mt-4`}>Cinco fases. Una cadena.</h2>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Cada fase la atiende un rol. Al aprobar, el contrato cambia de estado y se notifica
            automáticamente a quien sigue.
          </p>

          <ol className="mt-12 space-y-4">
            {PHASES.map((p, i) => {
              const Icon = p.icon;
              const last = i === PHASES.length - 1;
              return (
                <li key={p.n} className="relative">
                  <div className="grid gap-5 rounded-base border-2 border-border bg-background p-6 shadow-shadow md:grid-cols-[auto_1fr_1.2fr]">
                    {/* Número + rol */}
                    <div className="flex items-center gap-4 md:flex-col md:items-start md:gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-base border-2 border-border bg-main font-heading text-xl text-main-foreground shadow-sm">
                        {p.n}
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-main" />
                        <span className="font-heading text-lg uppercase tracking-wide">
                          {p.role}
                        </span>
                      </div>
                    </div>

                    {/* Acción + permisos */}
                    <div className="space-y-3 md:border-l-2 md:border-border-muted md:pl-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-sans uppercase tracking-wide text-muted-foreground">
                          Estado:
                        </span>
                        {p.statuses.map((s) => (
                          <StatusBadge key={s} status={s} />
                        ))}
                      </div>
                      <p className="text-sm leading-relaxed text-foreground">{p.action}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {p.privileges.map((pr) => (
                          <span
                            key={pr}
                            className="rounded-base border border-border-muted bg-secondary-background px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                          >
                            {pr}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Resultado + notificación */}
                    <div className="space-y-3 md:border-l-2 md:border-border-muted md:pl-5">
                      <div>
                        <p className="text-xs font-sans uppercase tracking-wide text-muted-foreground">
                          Resultado
                        </p>
                        <p className="mt-1 flex items-start gap-2 text-sm font-medium">
                          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-main" />
                          {p.result}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-sans uppercase tracking-wide text-muted-foreground">
                          Notifica a
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">{p.notify}</p>
                      </div>
                    </div>
                  </div>

                  {!last && (
                    <div className="flex justify-center py-1" aria-hidden="true">
                      <ArrowRight className="h-5 w-5 rotate-90 text-border-muted" />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* RAMAS ALTERNATIVAS */}
      <section className="border-b-2 border-border">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <p className={KICKER}>// No todo es línea recta</p>
          <h2 className={`${H2} mt-4`}>Caminos alternativos.</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BRANCHES.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.title}
                  className="rounded-base border-2 border-border bg-background p-5 shadow-shadow"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-base border-2 border-border bg-secondary-background">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <h3 className="mt-4 font-heading text-lg uppercase tracking-wide">{b.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SLA */}
      <section className="border-b-2 border-border bg-foreground text-background">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <p className="text-xs font-sans uppercase tracking-widest text-background/40">
            // Semáforo SLA
          </p>
          <h2 className={`${H2} mt-4 text-background`}>El tiempo, a la vista.</h2>
          <p className="mt-4 max-w-2xl text-lg text-background/60">
            Cada etapa tiene un tiempo máximo (SLA). Un indicador de color muestra, en tiempo real,
            qué contratos necesitan atención urgente — para que ninguno se quede atascado en
            silencio.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {SLA.map((s) => (
              <div
                key={s.label}
                className="rounded-base border-2 border-background/20 bg-background/5 p-6"
              >
                <div className="flex items-center gap-3">
                  <span className={`h-4 w-4 rounded-full border-2 border-background/40 ${s.dot}`} />
                  <span className="font-heading text-lg uppercase tracking-wide text-background">
                    {s.label}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-background/60">{s.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 flex items-center gap-2 text-sm text-background/40">
            <Clock className="h-4 w-4" /> El cálculo arranca cuando el contrato entra a cada etapa.
          </p>
        </div>
      </section>

      {/* MATRIZ DE PERMISOS */}
      <section id="permisos" className="scroll-mt-20 border-b-2 border-border bg-grid">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <p className={KICKER}>// Quién puede hacer qué</p>
          <h2 className={`${H2} mt-4`}>Matriz de permisos.</h2>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Los 19 privilegios del sistema y cómo se reparten entre los cinco roles. Esta es la
            fuente de verdad que gobierna cada botón y cada endpoint.
          </p>

          <div className="mt-10 overflow-x-auto rounded-base border-2 border-border bg-background shadow-shadow">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-border bg-secondary-background">
                  <th className="px-4 py-3 text-left font-heading text-xs uppercase tracking-wide">
                    Privilegio
                  </th>
                  {ROLE_VIEWS.map((r) => (
                    <th
                      key={r.id}
                      className="px-3 py-3 text-center font-heading text-xs uppercase tracking-wide"
                    >
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PRIVILEGE_ENTRIES.map(([code, label], idx) => (
                  <tr
                    key={code}
                    className={`border-b border-border-muted ${idx % 2 === 1 ? 'bg-secondary-background/40' : ''}`}
                  >
                    <td className="px-4 py-2.5">
                      <span className="block font-medium leading-tight">{label}</span>
                      <span className="block font-mono text-[11px] text-muted-foreground">
                        {code}
                      </span>
                    </td>
                    {ROLE_VIEWS.map((r) => {
                      const has = ROLE_PRIVILEGES[r.id].includes(code);
                      return (
                        <td key={r.id} className="px-3 py-2.5 text-center">
                          {has ? (
                            <Check
                              className="mx-auto h-4 w-4 text-main"
                              aria-label={`${r.label}: ${label}`}
                            />
                          ) : (
                            <span className="text-border-muted" aria-hidden="true">
                              ·
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-foreground text-background">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <div className="mb-8 flex justify-center">
            <FileSignature className="h-12 w-12 text-main" />
          </div>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-heading uppercase leading-tight tracking-wide">
            Listo para ver <span className="text-main">la verdad de cada contrato.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-background/55">
            Entra con una de las cuentas demo y recorre el flujo completo desde el rol que
            prefieras.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-base border-2 border-background bg-main px-6 py-3 font-sans text-main-foreground shadow-reverse transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              Entrar al sistema <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/landing"
              className="inline-flex items-center gap-2 rounded-base border-2 border-background/30 px-6 py-3 font-sans text-background/70 transition-colors hover:border-background/60 hover:text-background"
            >
              <CornerUpLeft className="h-4 w-4" /> Volver al inicio
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t-2 border-border bg-background py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="ALETHEIA"
              width={28}
              height={28}
              className="object-contain"
            />
            <span className="font-heading text-sm uppercase tracking-widest">ALETHEIA</span>
          </div>
          <p className="text-xs text-muted-foreground">Contract Lifecycle Management · ἀλήθεια</p>
        </div>
      </footer>
    </div>
  );
}
