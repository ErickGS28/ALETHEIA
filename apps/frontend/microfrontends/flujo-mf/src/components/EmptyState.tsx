'use client';

import { Card, CardContent } from '@aletheia/frontend-commons';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
}

/** Neutral empty/placeholder state inside a Card. */
export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
        {icon ? <div className="text-foreground/40">{icon}</div> : null}
        <p className="font-heading text-lg">{title}</p>
        {description ? (
          <p className="max-w-md font-sans text-sm text-foreground/50">{description}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
