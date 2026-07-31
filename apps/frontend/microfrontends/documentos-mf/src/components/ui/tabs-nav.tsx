'use client';

import { cn } from '@aletheia/frontend-commons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export interface TabItem {
  /** Route relative to the MF root, e.g. '/' or '/versiones'. */
  href: string;
  label: string;
  icon?: ReactNode;
}

/**
 * Neobrutalism tab bar that drives app-router navigation.
 * Active tab is derived from the current pathname (basePath-aware).
 */
export function TabsNav({ items }: { items: TabItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 border-b-2 border-border pb-3">
      {items.map((item) => {
        const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'inline-flex items-center gap-2 rounded-base border-2 border-border px-4 py-2 text-sm font-heading uppercase tracking-wide transition-all',
              isActive
                ? 'bg-main text-main-foreground shadow-shadow'
                : 'bg-background text-foreground shadow-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
