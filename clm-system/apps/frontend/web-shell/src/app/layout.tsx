import localFont from 'next/font/local';
import { Anton } from 'next/font/google';
import type { Metadata } from 'next';
import './globals.css';

const dmSans = localFont({
  src: [
    {
      path: '../../public/fonts/DMSans.ttf',
      style: 'normal',
    },
    {
      path: '../../public/fonts/DMSans-Italic.ttf',
      style: 'italic',
    },
  ],
  variable: '--font-dm-sans',
  display: 'swap',
});

const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-koulen',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ALETHEIA — CLM',
  description:
    'Contract Lifecycle Management. La verdad de cada contrato, al alcance de tu equipo.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${dmSans.variable} ${anton.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
