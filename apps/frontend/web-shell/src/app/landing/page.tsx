import { Button } from '@aletheia/frontend-commons';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSearch,
  FileX,
  PenLine,
  Scale,
  Shield,
  User,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

/* ─── Data ──────────────────────────────────────────────────────────── */

const H2 = 'text-[clamp(2.25rem,4vw,3.5rem)] font-heading leading-tight tracking-wide uppercase';

const painPoints = [
  {
    icon: FileSearch,
    title: 'Contratos sin rastro',
    desc: 'Acuerdos firmados que nadie recuerda cómo llegaron, quién los revisó o si siguen vigentes. Carpetas compartidas, correos enterrados, versiones que se contradicen.',
  },
  {
    icon: AlertTriangle,
    title: 'Aprobaciones sin responsable',
    desc: 'Cuando no existe un flujo definido, cualquiera puede aprobar cualquier cosa. Las responsabilidades se diluyen y las auditorías se vuelven imposibles.',
  },
  {
    icon: Clock,
    title: 'Plazos que nadie supervisa',
    desc: 'Los SLA vencen en silencio. Sin alertas visibles, los contratos quedan suspendidos en revisión semanas más allá de lo acordado.',
  },
  {
    icon: FileX,
    title: 'Auditorías imposibles',
    desc: 'Cuando alguien pregunta quién aprobó qué y cuándo, la respuesta es una búsqueda manual a través de correos y documentos sin versionado.',
  },
];

const capabilities = [
  {
    icon: Shield,
    title: 'Flujo contractual estructurado',
    desc: 'Cada contrato recorre etapas definidas: solicitud, revisión administrativa, validación legal, aprobación formal y firma. Cada transición queda registrada con actor, timestamp y comentario.',
  },
  {
    icon: CheckCircle2,
    title: 'Roles y responsabilidades exactas',
    desc: 'Cinco roles con privilegios granulares. Cada usuario ve y opera exactamente lo que le corresponde — ni más, ni menos. Los privilegios se emiten con el token JWT en cada sesión.',
  },
  {
    icon: Scale,
    title: 'Trazabilidad total e inmutable',
    desc: 'Bitácora completa de cada acción sobre cada contrato. Semáforo SLA visual que muestra en tiempo real qué contratos requieren atención urgente. Exportación en CSV para auditorías.',
  },
];

const roles = [
  {
    icon: User,
    name: 'Solicitante',
    desc: 'Crea la solicitud, adjunta documentos y envía a revisión. Puede cancelar o recuperar mientras sea su responsabilidad.',
    color: 'bg-main text-main-foreground',
  },
  {
    icon: Shield,
    name: 'Administrador',
    desc: 'Primera revisión. Puede aprobar, rechazar con comentario, gestionar usuarios y configurar los flujos de trabajo.',
    color: 'bg-foreground text-background',
  },
  {
    icon: Scale,
    name: 'Abogado',
    desc: 'Validación legal y documental. Accede a versiones de documentos, gestiona plantillas y decide si el contrato está listo para aprobación.',
    color: 'bg-background text-foreground',
  },
  {
    icon: CheckCircle2,
    name: 'Aprobador',
    desc: 'Autorización formal antes de la firma. Puede ver reportes completos del historial contractual del área.',
    color: 'bg-background text-foreground',
  },
  {
    icon: PenLine,
    name: 'Firmante',
    desc: 'Suscripción final mediante canvas de firma digital. Cierra el ciclo de vida del contrato.',
    color: 'bg-background text-foreground',
  },
];

/* ─── Page ──────────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── NAVBAR ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b-2 border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="ALETHEIA"
              width={32}
              height={32}
              className="object-contain"
            />
            <span className="text-xl font-heading tracking-widest uppercase">ALETHEIA</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a
              href="#capabilities"
              className="text-foreground/60 hover:text-foreground transition-colors"
            >
              Solución
            </a>
            <a
              href="#philosophy"
              className="text-foreground/60 hover:text-foreground transition-colors"
            >
              Filosofía
            </a>
            <a href="#roles" className="text-foreground/60 hover:text-foreground transition-colors">
              Roles
            </a>
            <Link
              href="/componentes"
              className="text-foreground/40 hover:text-foreground transition-colors flex items-center gap-1"
            >
              Componentes <ExternalLink className="w-3 h-3" />
            </Link>
          </nav>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className="relative h-[calc(100vh-64px)] grid lg:grid-cols-2 overflow-hidden border-b-2 border-border">
        {/* Left — text */}
        <div className="bg-grid flex flex-col justify-center px-8 lg:px-16 py-16 gap-8 relative z-10">
          <div className="space-y-6">
            <p className="text-xs font-sans text-foreground/40 tracking-widest uppercase">
              Gestión Contractual Enterprise
            </p>

            <h1 className="text-[clamp(2.75rem,5vw,4.5rem)] font-heading leading-[1.15] tracking-wide uppercase">
              La verdad de
              <br />
              cada contrato.
              <br />
              <span className="text-main">Sin ambigüedades.</span>
            </h1>

            <p className="text-xl text-foreground/60 max-w-lg leading-relaxed">
              ALETHEIA centraliza, estructura y traza el ciclo de vida contractual completo — desde
              la primera solicitud hasta la firma final — con roles claros, alertas SLA y bitácora
              inmutable.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button size="lg">
                Solicitar demo <ArrowRight />
              </Button>
              <Button size="lg" variant="neutral">
                Conocer el sistema
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm font-sans text-foreground/40">
            {[
              '5 roles con privilegios',
              'JWT + RBAC',
              'SLA en tiempo real',
              'Bitácora inmutable',
            ].map((t) => (
              <span
                key={t}
                className="flex items-center gap-2 before:content-['—'] before:text-main"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Right — logo showcase */}
        <div className="hidden lg:flex items-center justify-center border-l-2 border-border bg-grid relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center gap-6">
            <Image
              src="/logo.png"
              alt="ALETHEIA"
              width={320}
              height={320}
              className="object-contain drop-shadow-2xl"
              style={{ transform: 'rotate(-4deg)' }}
            />
            <div className="text-center">
              <p className="font-heading text-5xl tracking-widest uppercase text-foreground/10">
                ALETHEIA
              </p>
              <p className="font-sans text-sm text-foreground/40 tracking-widest mt-1">ἀλήθεια</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM ─────────────────────────────────────────────────── */}
      <section className="py-24 border-b-2 border-border bg-grid">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-14">
            <p className="text-xs font-sans text-foreground/40 tracking-widest mb-4">
              // EL PROBLEMA
            </p>
            <h2 className={H2}>
              El caos que
              <br />
              evitamos.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {painPoints.map((p, i) => (
              <div
                key={p.title}
                className="border-2 border-border bg-background rounded-base p-7 shadow-shadow hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-150"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 border-2 border-border rounded-base flex items-center justify-center bg-secondary-background flex-shrink-0">
                    <p.icon className="w-5 h-5 text-foreground/60" />
                  </div>
                  <span className="font-sans text-xs text-foreground/30 tracking-widest">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="text-xl font-heading uppercase tracking-wide mb-3">{p.title}</h3>
                <p className="text-lg text-foreground/60 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CAPABILITIES ────────────────────────────────────────────── */}
      <section
        id="capabilities"
        className="py-24 border-b-2 border-border bg-main text-main-foreground"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-14">
            <p className="text-xs font-sans text-main-foreground/50 tracking-widest mb-4">
              // LA SOLUCIÓN
            </p>
            <h2 className={`${H2} text-main-foreground`}>
              Cómo lo
              <br />
              resolvemos.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {capabilities.map((c) => (
              <div
                key={c.title}
                className="border-2 border-main-foreground/30 bg-main-foreground/10 rounded-base p-7 hover:bg-main-foreground/15 transition-colors"
              >
                <div className="w-11 h-11 border-2 border-main-foreground/30 rounded-base flex items-center justify-center mb-5 bg-main-foreground/10">
                  <c.icon className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-heading uppercase tracking-wide mb-3">{c.title}</h3>
                <p className="text-lg text-main-foreground/70 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PHILOSOPHY ──────────────────────────────────────────────── */}
      <section
        id="philosophy"
        className="py-24 border-b-2 border-border bg-foreground text-background overflow-hidden relative"
      >
        {/* Faint watermark logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
          <Image
            src="/logo.png"
            alt=""
            width={600}
            height={600}
            className="object-contain opacity-[0.04] brightness-0 invert"
            aria-hidden
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <p className="text-xs font-sans text-background/40 tracking-widest mb-8">
            // FILOSOFÍA · POR QUÉ UNA ORCA
          </p>

          <h2 className={`${H2} text-background mb-12`}>
            El depredador
            <br />
            más coordinado
            <br />
            del océano.
          </h2>

          <div className="space-y-7 text-xl text-background/75 leading-loose">
            <p>
              La orca no actúa por impulso.{' '}
              <span className="text-background font-heading">Actúa por protocolo.</span>
            </p>
            <p>
              Cada pod opera con una estructura precisa: la matriarca guía, los cazadores ejecutan,
              los custodios protegen. Nadie actúa fuera de su función. El grupo entero funciona como
              un sistema vivo de responsabilidades encadenadas, donde cada movimiento —desde el
              primer avistamiento hasta la captura— queda grabado en la memoria colectiva del pod.
            </p>
            <p>
              <span className="text-main font-heading">ALETHEIA</span> lleva este principio a la
              gestión de contratos. El <span className="text-background">Solicitante</span> inicia.
              El <span className="text-background">Administrador</span> coordina. El{' '}
              <span className="text-background">Abogado</span> protege la integridad documental. El{' '}
              <span className="text-background">Aprobador</span> sanciona con autoridad. El{' '}
              <span className="text-background">Firmante</span> cierra el ciclo. Privilegios
              granulares para cada uno —ni más, ni menos— porque en un contrato, como en el océano,
              la ambigüedad es el único error que no se puede corregir.
            </p>
            <p>
              Las orcas también poseen{' '}
              <span className="text-background font-heading">memoria perfecta</span>. Reconocen
              rutas, recuerdan patrones, aprenden de cada ciclo. ALETHEIA preserva cada acción, cada
              aprobación, cada rechazo en una bitácora inmutable. La historia completa de cada
              contrato, siempre disponible, siempre verificable.
            </p>
          </div>

          {/* Greek quote */}
          <div className="mt-14 pt-10 border-t-2 border-background/20">
            <p className="text-4xl font-heading text-main tracking-widest mb-3">ἀλήθεια</p>
            <p className="text-xl text-background/50 italic leading-relaxed">
              &ldquo;La verdad que se desoculta.&rdquo; — Los mejores acuerdos no se ocultan: se
              trazan con claridad, se validan con rigor y se cierran con certeza.
            </p>
          </div>
        </div>
      </section>

      {/* ── ROLES ───────────────────────────────────────────────────── */}
      <section id="roles" className="py-24 border-b-2 border-border bg-grid">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-14">
            <p className="text-xs font-sans text-foreground/40 tracking-widest mb-4">
              // ESTRUCTURA DE ROLES
            </p>
            <h2 className={H2}>
              Cinco roles.
              <br />
              Una cadena.
            </h2>
          </div>

          <div className="grid md:grid-cols-5 gap-4">
            {roles.map((role, i) => (
              <div
                key={role.name}
                className={`border-2 border-border rounded-base p-6 shadow-shadow hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all ${role.color}`}
              >
                <div className="flex items-center justify-between mb-5">
                  <role.icon className="w-5 h-5" />
                  <span className="font-sans text-xs opacity-30 font-heading">0{i + 1}</span>
                </div>
                <h3 className="font-heading text-base uppercase tracking-wide mb-3">{role.name}</h3>
                <p className="text-base opacity-65 leading-relaxed">{role.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="relative py-28 bg-foreground text-background border-b-2 border-border overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, #15A8B5 0, #15A8B5 1px, transparent 0, transparent 50%)',
            backgroundSize: '16px 16px',
          }}
        />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="flex justify-center mb-10">
            <Image
              src="/logo.png"
              alt="ALETHEIA"
              width={80}
              height={80}
              className="object-contain brightness-0 invert opacity-80"
            />
          </div>
          <h2 className="text-[clamp(2.5rem,5vw,4.5rem)] font-heading leading-tight tracking-wide uppercase mb-6">
            ¿Su organización necesita
            <br />
            <span className="text-main">orden contractual?</span>
          </h2>
          <p className="text-xl text-background/55 mb-10 max-w-xl mx-auto leading-relaxed">
            Cada contrato es un compromiso. ALETHEIA garantiza que ese compromiso se gestione con
            precisión, responsabilidad y total trazabilidad.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button variant="reverse" size="lg">
              Solicitar demo <ArrowRight />
            </Button>
            <Link
              href="/componentes"
              className="border-2 border-background/25 text-background/70 px-6 py-3 rounded-base text-sm font-sans hover:text-background hover:border-background/50 transition-colors inline-flex items-center gap-2"
            >
              Ver sistema de diseño <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="py-10 border-t-2 border-border bg-grid">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="ALETHEIA"
              width={30}
              height={30}
              className="object-contain"
            />
            <div>
              <p className="font-heading text-sm tracking-widest uppercase">ALETHEIA</p>
              <p className="text-sm text-foreground/40">Contract Lifecycle Management</p>
            </div>
          </div>
          <nav className="flex items-center gap-6 text-sm font-sans text-foreground/40">
            <a href="#capabilities" className="hover:text-foreground transition-colors">
              Solución
            </a>
            <a href="#philosophy" className="hover:text-foreground transition-colors">
              Filosofía
            </a>
            <a href="#roles" className="hover:text-foreground transition-colors">
              Roles
            </a>
            <Link href="/componentes" className="hover:text-foreground transition-colors">
              Componentes
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
