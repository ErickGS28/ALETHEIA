'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from '@aletheia/frontend-commons';
import { type FormEvent, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

// Credenciales demo fijas (sembradas por el agente de seed) para agilizar la demo.
const DEMO_USERS: { email: string; label: string }[] = [
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
          : 'No se pudo iniciar sesión. Intenta de nuevo.',
      );
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(email, password);
  };

  const quickLogin = (mail: string) => {
    setEmail(mail);
    setPassword(DEMO_PASSWORD);
    submit(mail, DEMO_PASSWORD);
  };

  return (
    <main className="bg-grid min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <header className="text-center mb-8 animate-hero">
          <h1 className="text-6xl font-heading text-foreground tracking-tight">ALETHEIA</h1>
          <p className="font-mono text-foreground/60 mt-2">Contract Lifecycle Management</p>
        </header>

        <Card className="animate-hero delay-100">
          <CardHeader>
            <CardTitle>Iniciar sesión</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="font-mono text-sm text-foreground/70">
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

              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="font-mono text-sm text-foreground/70">
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
                <p className="font-mono text-sm text-red-600 border-2 border-border bg-red-50 px-3 py-2 rounded-base">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isLoggingIn}>
                {isLoggingIn ? 'Entrando…' : 'Entrar'}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t-2 border-border">
              <div className="flex items-center justify-between mb-3">
                <p className="font-mono text-xs text-foreground/60">Acceso rápido (demo)</p>
                <Badge variant="secondary">password123</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_USERS.map((u) => (
                  <Button
                    key={u.email}
                    type="button"
                    variant="neutral"
                    size="sm"
                    disabled={isLoggingIn}
                    onClick={() => quickLogin(u.email)}
                  >
                    {u.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
