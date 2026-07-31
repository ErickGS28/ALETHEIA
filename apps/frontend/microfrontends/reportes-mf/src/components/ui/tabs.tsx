'use client';

import { cn } from '@aletheia/frontend-commons';
import type { ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
}

/**
 * Local Neobrutalism tab switcher (no shared Tabs primitive in commons).
 * Implemented as buttons with ARIA tab semantics.
 */
export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div
      role="tablist"
      className="inline-flex flex-wrap gap-2 rounded-base border-2 border-border bg-secondary-background p-1 shadow-shadow"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-base px-4 py-2 text-sm font-heading transition-all [&_svg]:size-4',
              isActive
                ? 'border-2 border-border bg-main text-main-foreground shadow-shadow'
                : 'border-2 border-transparent text-foreground/70 hover:text-foreground',
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
