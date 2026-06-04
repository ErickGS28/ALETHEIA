'use client';

import { Button, Input } from '@aletheia/frontend-commons';
import { type FormEvent, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const DEMO_USERS = [
  { email: 'admin@aletheia.com', label: 'Administrador' },
  { email: 'solicitante@aletheia.com', label: 'Solicitante' },
  { email: 'abogado@aletheia.com', label: 'Abogado' },
  { email: 'aprobador@aletheia.com', label: 'Aprobador' },
  { email: 'firmante@aletheia.com', label: 'Firmante' },
];
const DEMO_PASSWORD = 'password123';

export function RoleLogin() {
  const { login, isLoggingIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (mail: string, pass: string) => {
    setError(null);
    try {
      await login(mail, pass);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      setError(
        status === 401 || status === 404
          ? 'Credenciales inválidas. Verifica tu correo y contraseña.'
          : 'No se pudo conectar con el servidor. Intenta de nuevo.',
      );
    }
  };

  return (
    <main className="min-h-screen flex">
      {/* ── Left brand panel ─────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[56%] flex-col justify-between bg-foreground text-background p-14 relative overflow-hidden select-none">
        {/* Top teal accent stripe */}
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: '#15a8b5' }} />

        {/* Subtle dot-grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="h-9 w-9 flex items-center justify-center border-2 font-heading text-base"
            style={{ background: '#15a8b5', borderColor: 'rgba(255,255,255,0.15)', color: '#fff' }}
          >
            A
          </div>
          <span className="font-heading text-xl tracking-tight">ALETHEIA</span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10">
          <h1
            className="font-heading leading-[0.9] tracking-tight text-background mb-6"
            style={{ fontSize: 'clamp(3.5rem, 5.5vw, 5.5rem)' }}
          >
            LA VERDAD
            <br />
            DE CADA
            <br />
            CONTRATO.
          </h1>
          <p className="text-background/45 max-w-xs text-sm leading-relaxed">
            Sistema integrado de gestión del ciclo de vida de contratos. Desde la solicitud hasta la
            firma, con trazabilidad completa y control por roles.
          </p>
        </div>

        {/* Footer meta */}
        <div className="relative z-10 border-t border-background/10 pt-6">
          <p className="text-xs uppercase tracking-[0.15em] text-background/25 font-heading mb-2">
            Módulos del sistema
          </p>
          <p className="text-xs text-background/35 leading-relaxed">
            Solicitudes · Contratos · Documentos · Flujo de trabajo · Firmas · Reportes ·
            Administración
          </p>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-secondary-background px-8 py-12">
        <div className="w-full max-w-[360px]">
          {/* Mobile-only brand */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="font-heading text-4xl tracking-tight">ALETHEIA</h1>
            <p className="text-foreground/50 text-sm mt-1">Contract Lifecycle Management</p>
          </div>

          {/* Card */}
          <div className="border-2 border-border bg-background rounded-base shadow-shadow">
            <div className="px-7 pt-7 pb-4">
              <h2 className="font-heading text-2xl leading-none">Iniciar sesión</h2>
              <p className="text-sm text-foreground/45 mt-1.5">
                Ingresa tus credenciales para acceder
              </p>
            </div>

            <div className="px-7 pb-7">
              <form
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  submit(email, password);
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm text-foreground/65 font-sans">
                    Correo electrónico
                  </label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@aletheia.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-sm text-foreground/65 font-sans">
                    Contraseña
                  </label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <div className="border-2 border-red-500 bg-red-50 rounded-base px-3 py-2.5">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={isLoggingIn}>
                  {isLoggingIn ? 'Iniciando sesión…' : 'Entrar →'}
                </Button>
              </form>

              {/* Quick login */}
              <div className="mt-6 pt-5 border-t-2 border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-foreground/45 font-sans">Acceso rápido — demo</span>
                  <code className="text-xs bg-secondary-background border-2 border-border px-2 py-0.5 rounded-base font-sans">
                    password123
                  </code>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DEMO_USERS.map((u) => (
                    <button
                      key={u.email}
                      type="button"
                      disabled={isLoggingIn}
                      onClick={() => {
                        setEmail(u.email);
                        setPassword(DEMO_PASSWORD);
                        submit(u.email, DEMO_PASSWORD);
                      }}
                      className="text-xs font-sans px-3 py-1.5 border-2 border-border rounded-base bg-background shadow-[2px_2px_0_0_var(--color-shadow)] transition-all hover:bg-secondary-background hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
