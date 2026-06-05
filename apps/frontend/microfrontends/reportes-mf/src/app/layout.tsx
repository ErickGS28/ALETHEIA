import { ApiProvider, ToastProvider } from '@aletheia/frontend-commons';
import type { Metadata } from 'next';
import { Anton, DM_Sans } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });
const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-koulen',
  display: 'swap',
});

export const metadata: Metadata = { title: 'Reportes · ALETHEIA' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${dmSans.variable} ${anton.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <ApiProvider>
          <ToastProvider>{children}</ToastProvider>
        </ApiProvider>
      </body>
    </html>
  );
}
