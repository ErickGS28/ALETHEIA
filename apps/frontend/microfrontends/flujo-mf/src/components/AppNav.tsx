'use client';

import { cn } from '@aletheia/frontend-commons';
import Link from 'next/link';
import { GaugeIcon, InboxIcon, TimelineIcon } from './ui/icons';

type NavKey = 'panel' | 'sla' | 'timeline';

interface NavItem {
  key: NavKey;
  label: string;
  href: string;
  icon: typeof InboxIcon;
}

// hrefs are relative to basePath `/flujo` — next/link prefixes it automatically.
const ITEMS: NavItem[] = [
  { key: 'panel', label: 'Panel de revisión', href: '/', icon: InboxIcon },
  { key: 'sla', label: 'Semáforo SLA', href: '/sla', icon: GaugeIcon },
  { key: 'timeline', label: 'Línea de tiempo', href: '/timeline', icon: TimelineIcon },
];

/** Tab-style navigation between the three flujo-mf views. */
export function AppNav({ active }: { active: NavKey }) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Navegación de flujo">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = item.key === active;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-2 rounded-base border-2 border-border px-3 py-2 text-sm font-heading shadow-shadow transition-all',
              'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
              isActive ? 'bg-main text-main-foreground' : 'bg-background text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
