import { Logo, Spinner } from '@aletheia/frontend-commons';

/**
 * Pantalla de transición durante la hidratación de sesión.
 * Evita el flash de login al volver de un microfrontend (Multi-Zones).
 */
export function AuthSplash() {
  return (
    <main className="bg-grid flex min-h-screen flex-col items-center justify-center gap-6">
      <Logo size={56} variant="full" />
      <Spinner size="md" className="text-foreground/40" />
    </main>
  );
}
