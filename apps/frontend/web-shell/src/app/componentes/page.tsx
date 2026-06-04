import { ContractDataTable } from '@aletheia/frontend-commons';
import { Badge } from '@aletheia/frontend-commons';
import { Button } from '@aletheia/frontend-commons';
import { Input } from '@aletheia/frontend-commons';
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock,
  PenLine,
  Scale,
  Shield,
  User,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const statuses = [
  { label: 'DRAFT', color: 'bg-secondary-background text-foreground border-border' },
  { label: 'SUBMITTED', color: 'bg-main text-main-foreground border-border' },
  { label: 'ADMIN_REVIEW', color: 'bg-yellow-400 text-black border-border' },
  { label: 'LAWYER_REVIEW', color: 'bg-orange-400 text-black border-border' },
  { label: 'APPROVAL_PENDING', color: 'bg-blue-400 text-black border-border' },
  { label: 'SIGNING', color: 'bg-purple-400 text-black border-border' },
  { label: 'SIGNED', color: 'bg-green-500 text-white border-border' },
  { label: 'REJECTED', color: 'bg-red-500 text-white border-border' },
  { label: 'CANCELLED', color: 'bg-foreground text-background border-border' },
];

const roles = [
  {
    icon: User,
    name: 'Solicitante',
    desc: 'Crea y gestiona sus solicitudes de contrato.',
    privileges: ['CONTRACT_CREATE', 'CONTRACT_EDIT', 'CONTRACT_SUBMIT'],
    accent: true,
  },
  {
    icon: Shield,
    name: 'Administrador',
    desc: 'Primera revisión y configuración del sistema.',
    privileges: ['CONTRACT_REVIEW_ADMIN', 'USERS_MANAGE', 'WORKFLOW_CONFIG'],
    accent: false,
  },
  {
    icon: Scale,
    name: 'Abogado',
    desc: 'Revisión legal y validación documental.',
    privileges: ['CONTRACT_REVIEW_LAWYER', 'DOCUMENT_VERSION', 'TEMPLATES_MANAGE'],
    accent: false,
  },
  {
    icon: CheckCircle2,
    name: 'Aprobador',
    desc: 'Aprobación formal antes de la firma.',
    privileges: ['CONTRACT_APPROVE', 'REPORTS_VIEW'],
    accent: false,
  },
  {
    icon: PenLine,
    name: 'Firmante',
    desc: 'Firma y suscripción final del contrato.',
    privileges: ['CONTRACT_SIGN'],
    accent: false,
  },
];

export default function ComponentesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── NAVBAR ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b-2 border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Link
              href="/"
              className="flex items-center gap-2 text-foreground/50 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-sans">Inicio</span>
            </Link>
            <div className="h-4 w-[2px] bg-border" />
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="ALETHEIA"
                width={22}
                height={22}
                className="object-contain"
              />
              <span className="font-heading text-sm tracking-widest uppercase">ALETHEIA</span>
              <span className="font-sans text-sm text-foreground/40">/ Sistema de Diseño</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-sans text-foreground/30 hidden md:block">
              Neobrutalism · Tailwind v4 · shadcn/ui
            </span>
          </div>
        </div>
      </header>

      {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
      <div className="border-b-2 border-border py-16 bg-grid">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-xs font-sans text-foreground/40 tracking-widest mb-3">
            // ALETHEIA · SISTEMA DE DISEÑO
          </p>
          <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-heading leading-none tracking-wide uppercase mb-5">
            Componentes UI
          </h1>
          <p className="text-xl text-foreground/60 max-w-xl leading-relaxed">
            Biblioteca de componentes Neobrutalism basada en shadcn/ui, configurada con Tailwind CSS
            v4 y la paleta de marca de ALETHEIA — blanco, negro y{' '}
            <span className="text-main font-heading">#15A8B5</span>.
          </p>
        </div>
      </div>

      {/* ── COMPONENTES ─────────────────────────────────────────────── */}
      <div className="py-16 border-b-2 border-border bg-grid">
        <div className="max-w-7xl mx-auto px-6 space-y-5">
          {/* Buttons */}
          <div className="border-2 border-border bg-background rounded-base p-6 shadow-shadow">
            <p className="text-[10px] font-sans text-foreground/40 tracking-widest mb-1">BOTONES</p>
            <p className="text-sm text-foreground/50 mb-5">
              9 variantes · 3 tamaños · neobrutalism hover (translate + shadow)
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="default">Solicitar contrato</Button>
              <Button variant="neutral">Revisar →</Button>
              <Button variant="secondary">Ver historial</Button>
              <Button variant="destructive">Rechazar</Button>
              <Button variant="ghost">Cancelar</Button>
              <Button variant="outline">Exportar CSV</Button>
              <Button variant="noShadow">Sin sombra</Button>
              <Button variant="default" size="sm">
                Aprobar (sm)
              </Button>
              <Button variant="default" size="lg">
                Firmar contrato (lg)
              </Button>
            </div>
          </div>

          {/* Status badges */}
          <div className="border-2 border-border bg-background rounded-base p-6 shadow-shadow">
            <p className="text-[10px] font-sans text-foreground/40 tracking-widest mb-1">
              ESTADOS DEL CONTRATO
            </p>
            <p className="text-sm text-foreground/50 mb-5">
              9 estados · ciclo de vida completo del CLM
            </p>
            <div className="flex flex-wrap gap-2">
              {statuses.map((s) => (
                <span
                  key={s.label}
                  className={`border-2 ${s.color} px-2.5 py-1 rounded-base text-[10px] font-heading tracking-widest shadow-[2px_2px_0px_0px_#000]`}
                >
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          {/* Badges + Inputs */}
          <div className="grid md:grid-cols-2 gap-5">
            <div className="border-2 border-border bg-background rounded-base p-6 shadow-shadow">
              <p className="text-[10px] font-sans text-foreground/40 tracking-widest mb-1">
                BADGES (shadcn)
              </p>
              <p className="text-sm text-foreground/50 mb-5">
                5 variantes — default · secondary · destructive · neutral · outline
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">Contrato activo</Badge>
                <Badge variant="secondary">En revisión</Badge>
                <Badge variant="destructive">Rechazado</Badge>
                <Badge variant="neutral">Sin asignar</Badge>
                <Badge variant="outline">Archivado</Badge>
              </div>
            </div>
            <div className="border-2 border-border bg-background rounded-base p-6 shadow-shadow">
              <p className="text-[10px] font-sans text-foreground/40 tracking-widest mb-1">
                INPUTS
              </p>
              <p className="text-sm text-foreground/50 mb-5">
                IBM Plex Mono · border-2 · shadow-shadow · focus ring
              </p>
              <div className="space-y-3">
                <Input placeholder="Buscar por número o proveedor..." />
                <Input placeholder="correo@empresa.com" type="email" />
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div className="border-2 border-border bg-background rounded-base p-6 shadow-shadow">
            <p className="text-[10px] font-sans text-foreground/40 tracking-widest mb-1">
              TARJETAS DE MÉTRICAS
            </p>
            <p className="text-sm text-foreground/50 mb-5">
              hover: translate(4px, 4px) + shadow-none — efecto neobrutalism
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Contratos activos', value: '12', bar: 'bg-main', pct: '60%' },
                { label: 'SLA vencidos', value: '3', bar: 'bg-red-500', pct: '15%' },
                { label: 'Firmados este mes', value: '8', bar: 'bg-green-500', pct: '80%' },
                { label: 'Pendientes de firma', value: '4', bar: 'bg-purple-400', pct: '40%' },
              ].map((c) => (
                <div
                  key={c.label}
                  className="border-2 border-border rounded-base bg-background p-4 shadow-shadow hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all"
                >
                  <div className="h-1.5 w-full rounded-full bg-secondary-background mb-3 overflow-hidden">
                    <div className={`h-full ${c.bar} rounded-full`} style={{ width: c.pct }} />
                  </div>
                  <p className="text-[10px] font-sans text-foreground/40 tracking-widest">
                    {c.label.toUpperCase()}
                  </p>
                  <p className="text-4xl font-heading mt-0.5">{c.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Roles cards */}
          <div className="border-2 border-border bg-background rounded-base p-6 shadow-shadow">
            <p className="text-[10px] font-sans text-foreground/40 tracking-widest mb-1">
              TARJETAS DE ROL
            </p>
            <p className="text-sm text-foreground/50 mb-5">
              5 roles del sistema CLM con privilegios
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {roles.map((role) => (
                <div
                  key={role.name}
                  className={`border-2 border-border rounded-base p-4 shadow-shadow hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all ${role.accent ? 'bg-main text-main-foreground' : 'bg-background text-foreground'}`}
                >
                  <role.icon className="w-4 h-4 mb-3" />
                  <h3 className="font-heading text-xs tracking-wide uppercase mb-1.5">
                    {role.name}
                  </h3>
                  <p className="text-xs opacity-60 mb-3 leading-relaxed">{role.desc}</p>
                  <div className="space-y-1">
                    {role.privileges.map((p) => (
                      <div
                        key={p}
                        className={`text-[9px] font-sans px-1.5 py-0.5 rounded border tracking-wider ${role.accent ? 'border-main-foreground/20 bg-main-foreground/10' : 'border-border bg-secondary-background'}`}
                      >
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Data Table */}
          <div className="border-2 border-border bg-background rounded-base p-6 shadow-shadow">
            <p className="text-[10px] font-sans text-foreground/40 tracking-widest mb-1">
              DATA TABLE
            </p>
            <p className="text-sm text-foreground/50 mb-5">
              @tanstack/react-table · sorting · filtering · column visibility · row selection ·
              pagination
            </p>
            <ContractDataTable />
          </div>
        </div>
      </div>

      {/* ── STRIP ───────────────────────────────────────────────────── */}
      <div className="bg-foreground text-background py-4 border-b-2 border-border">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap gap-x-10 gap-y-2 font-sans text-sm items-center">
          {(
            [
              [Zap, 'Tailwind CSS v4 · CSS-first'],
              [Shield, 'Neobrutalism · shadcn/ui'],
              [Clock, 'Barlow Condensed + IBM Plex Mono'],
              [BarChart3, 'border-2 · shadow-shadow · rounded-base'],
            ] as const
          ).map(([Icon, text], i) => (
            <div key={i} className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-main flex-shrink-0" />
              <span className="text-background/70">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="py-8 bg-grid">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-3 text-foreground/50 hover:text-foreground transition-colors"
          >
            <Image
              src="/logo.png"
              alt="ALETHEIA"
              width={24}
              height={24}
              className="object-contain"
            />
            <span className="font-heading text-sm tracking-widest uppercase">ALETHEIA</span>
          </Link>
          <span className="text-xs font-sans text-foreground/30">
            Sistema de Diseño · Neobrutalism
          </span>
        </div>
      </footer>
    </div>
  );
}
