import { ApiProvider, MfSidebar, ToastProvider } from '@aletheia/frontend-commons';
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

export const metadata: Metadata = { title: 'Contratos · ALETHEIA' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${dmSans.variable} ${anton.variable}`} suppressHydrationWarning>
      <body className="bg-background text-foreground font-sans antialiased">
        <ApiProvider>
          <ToastProvider>
            <MfSidebar>{children}</MfSidebar>
          </ToastProvider>
        </ApiProvider>
      </body>
    </html>
  );
}
